# Copyright 2012,2013 Eucalyptus Systems, Inc.
#
# Redistribution and use of this software in source and binary forms,
# with or without modification, are permitted provided that the following
# conditions are met:
#
#   Redistributions of source code must retain the above copyright notice,
#   this list of conditions and the following disclaimer.
#
#   Redistributions in binary form must reproduce the above copyright
#   notice, this list of conditions and the following disclaimer in the
#   documentation and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
# A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
# OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
# LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
# DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
# THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

import boto
import ConfigParser
import hashlib
import logging
import json
import socket
import sys;
import traceback
import threading
from threading import ThreadError
from datetime import datetime, timedelta

from boto.ec2.ec2object import EC2Object
from boto.exception import BotoServerError

import eucaconsole


# This contains methods to act on all caches within the session.
class CacheManager(object):
    # This function is called by the api layer to get a summary of caches for the dashboard
    def get_cache_summary(self, session, zone):
        # make sparse array containing names of resource with updates
        summary = {}
        numRunning = 0;
        numStopped = 0;
        #logging.info("CACHE SUMMARY: about to calculate summary info for zone :"+zone)
        if not (session.clc.caches['instances'].isCacheStale()):
            for reservation in session.clc.caches['instances'].values:
                if issubclass(reservation.__class__, EC2Object):
                    for inst in reservation.instances:
                        if zone == 'all' or inst.placement == zone:
                            state = inst.state
                            if state == 'running':
                                numRunning += 1
                            elif state == 'stopped':
                                numStopped += 1
                else:
                    for inst in reservation['instances']:
                        if zone == 'all' or inst['placement'] == zone:
                            state = inst['_state']['name']
                            if state == 'running':
                                numRunning += 1
                            elif state == 'stopped':
                                numStopped += 1
        else:
            numRunning = -1
            numStopped = -1
        summary['inst_running'] = numRunning
        summary['inst_stopped'] = numStopped
        #logging.info("CACHE SUMMARY: instance running :"+str(numRunning))
        summary['keypair'] = session.clc.caches['keypairs'].getSummary()
        summary['sgroup'] = session.clc.caches['groups'].getSummary()
        summary['volume'] = session.clc.caches['volumes'].getSummary()
        summary['snapshot'] = session.clc.caches['snapshots'].getSummary()
        summary['addresses'] = session.clc.caches['addresses'].getSummary()
        if session.scaling != None:
            summary['scalinginsts'] = session.scaling.caches['scalinginsts'].getSummary()
        return summary

    # This method is called to define which caches are refreshed regularly.
    # The normal mode would be to update all caches based on their configured poll frequency.
    # When min.clc.polling is set, the passed resource list will be used to determine which
    # caches to refresh (as a means to reduce CLC load).
    def set_data_interest(self, session, resources):
        try:
            self.min_polling = eucaconsole.config.getboolean('server', 'min.clc.polling')
        except ConfigParser.NoOptionError:
            self.min_polling = False
        # aggregate caches into single list
        caches = {}
        for res in session.clc.caches:
            caches[res] = session.clc.caches[res]
        if session.scaling:
            for res in session.scaling.caches:
                caches[res] = session.scaling.caches[res]
        if session.cw:
            for res in session.cw.caches:
                caches[res] = session.cw.caches[res]
        if session.elb:
            for res in session.elb.caches:
                caches[res] = session.elb.caches[res]

        # remove these if passed since they are handled by the public data stuff
        if session.account == 'aws':
            if 'allimages' in resources:
                resources.remove('allimages')
            if 'amazonimages' in resources:
                resources.remove('amazonimages')

        if self.min_polling:
            cancelled = 0
            restarted = 0
            started = 0
            # clear previous timers not needed now
            for res in caches:
                if not(res in resources) and caches[res].is_running():
                    caches[res].cancel_timer()
                    cancelled += 1
            # start timers for new list of resources, restart those already running
            for res in resources:
                if caches[res].is_running():
                    caches[res].restart_timer(force=False)
                    restarted += 1
                else:
                    caches[res].start_timer({})
                    started += 1
            logging.debug("(-------- Cancelled:%d, Restarted:%d, Started:%d ---------)" %(cancelled, restarted, started))
        else:
            # cancel old, then start new timers for all cached resources
            for res in caches:
                caches[res].cancel_timer()
            for res in caches:
                caches[res].start_timer({})
        return True


class Cache(object):
    def __init__(self, name, updateFreq, getcall, user_session, json_encoder):
        self.name = name
        self.updateFreq = updateFreq
        self.lastUpdate = datetime.min
        self._getcall = getcall
        self._user_session = user_session
        self._json_encoder = json_encoder
        self._timer = None
        self._values = []
        self._length = 0
        self._set_lock = threading.Lock()
        self._timer_lock = threading.Lock()
        self._freshData = True
        self._filters = None
        self._hash = ''
        self._send_update = False   # used to force a push notification, like when a timer is started for
                                    # resource using the above set_data_interest() call.

    # staleness is determined by an age calculation (based on updateFreq)
    def isCacheStale(self, filters=None):
        if cmp(filters, self._filters) != 0:
            return True
        return ((datetime.now() - self.lastUpdate) > timedelta(seconds=self.updateFreq))

    # freshness is defined (not as !stale, but) as new data which has not been read yet
    def is_cache_fresh(self):
        return self._freshData

    def expireCache(self):
        self.lastUpdate = datetime.min
        # get timer restarted now to get data faster
        self.cancel_timer();
        self.start_timer({});

    def filters(self, filters):
        self._filters = filters

    def getSummary(self):
        return -1 if self.isCacheStale() else self._length

    @property
    def values(self):
        self._freshData = False
        return self._values

    @values.setter
    def values(self, value):
        self._set_lock.acquire()
        try:
            self._freshData = False
            h = hashlib.new('md5')
            for item in value:
                if isinstance(item, boto.resultset.ResultSet):
                    continue
                item_dict = getattr(item, '__dict__', None)
                if item_dict:
                    del item_dict['connection']
                    if 'region' in item_dict.keys():
                        del item_dict['region']
                    if self.name == 'instances':  # need to pull instances out of reservations
                        if issubclass(item.__class__, EC2Object):
                            for instance in item.instances:
                                instdict = instance.__dict__
                                bdm = instdict['block_device_mapping']
                                del instdict['block_device_mapping']
                                h.update(str(instdict.values()))
                                instdict['block_device_mapping'] = bdm
                                for map in bdm.keys():
                                    h.update(map);
                                    del bdm[map].__dict__['connection']
                                    h.update(str(bdm[map].__dict__.values()))
                        else:   # mock data
                            for instance in item['instances']:
                                h.update(str(instance.__dict__.values()))
                    elif self.name == 'images' or self.name == 'amazonimages' or self.name == 'allimages':  # need to handle bdm objects in images
                        imgdict = item.__dict__
                        bdm = imgdict['block_device_mapping']
                        #TODO: include bdm in hash
                        del imgdict['block_device_mapping']
                        h.update(str(imgdict.values()))
                        imgdict['block_device_mapping'] = bdm
                        for map in bdm.keys():
                            h.update(map);
                            del bdm[map].__dict__['connection']
                            h.update(str(bdm[map].__dict__.values()))
                    else:
                        h.update(str(item_dict.values()))
            hash = h.hexdigest()
# Keep this code around for a bit. It helps debug data value differences that affect the hash
#            if self.name == 'images' and len(self.values) > 0:
#                for j in range(0, len(value)-1):
#                    item = value[j]
#                    if str(item.__dict__.values()) != str(self._values[j].__dict__.values()):
#                        logging.info("====== old value ============")
#                        logging.info(str(item.__dict__))
#                        logging.info("------ new value ------------")
#                        logging.info(str(self._values[j].__dict__))
#                        logging.info("=============================")
#                    keys = item.__dict__.keys()
#                    for i in range(0, len(keys)-1):
#                        if item.__dict__[keys[i]] != self._values[j].__dict__[keys[i]]:
#                            logging.info("this is different! "+str(item.__dict__[keys[i]])+" vs "+str(self._values[j].__dict__[keys[i]]))
            #logging.info("old hash = "+self._hash)
            #logging.info("new hash = "+hash)
            if self._values == [] and value != []:
                self._freshData = True
            elif not (hash == self._hash):
                self._freshData = True
                #logging.info("value for hash = "+str(value.__dict__))
            #logging.info("values match" if self._hash == hash else "VALUES DON'T MATCH")
            if self.name == 'alliamges' or self.name == 'amazonimages':
                #logging.debug("values to be converted = "+str(len(value)))
                self._values = json.dumps(value, cls=self._json_encoder)
                #logging.debug("converted cache = "+self._values)
            else:
                self._values = value
            self._length = len(value)
            self._hash = hash
            self.lastUpdate = datetime.now()
            if self.is_cache_fresh() or self._send_update:
                logging.debug("sending update for :" + self.name)
                self._user_session.push_handler.send_msg(self.name)
                self._send_update = False
        except:
            traceback.print_exc(file=sys.stdout)
        finally:
            self._set_lock.release()

    # calling this will cause a push notification to be produced after data is fetched.
    def start_timer(self, kwargs, caller='start'): 
        # ensure the timer worker isn't running
        self._send_update = True
        self.__cache_load_callback__(kwargs, self.updateFreq, True, caller=caller)

    # cancel the timer, though if worker running, it may not really cancel till worker is done
    # using force=False means if worker is running, timer not cancelled (returns False in that case)
    def cancel_timer(self, force=True):
        if self._timer:
            if not(force):
                # test lock
                if self._timer_lock.acquire(False):
                    self._timer_lock.release()  # if able to acquire, release right away
                else:
                    self._send_update = True
                    return False # lock not acquired, so worker must be running
            self._timer.cancel()
            self._timer = None
        return True

    # causes timer to restart if one was running
    # if force=False, timer only restarted if it was waiting (not busy fetching data)
    def restart_timer(self, force=True):
        if self._timer:
            if self.cancel_timer(force=force):
                # TODO: kwargs should be passed. Not used yet, but this will bite us someday
                self.start_timer({}, caller='restart');

    def is_running(self):
        return self._timer != None

    def __cache_load_callback__(self, kwargs, interval, firstRun=False, caller='timer'):
        self._timer_lock.acquire()
        #logging.debug("CACHE: <<<<<<<<<<<<<<<< got %s timer lock (%s)"%(self.name, caller));
        try:
            local_interval = interval
            if firstRun:
                # use really small interval to cause background fetch very quickly
                local_interval = 0.3    # how about some randomness to space out requests slightly?
            else:
                try:
                    logging.debug("CACHE: fetching values for :" + str(self._getcall.__name__))
                    try:
                        values = self._getcall(kwargs)
                    except Exception as ex:
                        self.values = '[]'
                        if isinstance(ex, BotoServerError):
                            logging.info("CACHE: error calling " + self._getcall.__name__ +
                                         "(" + str(ex.status) + "," + ex.reason + "," + ex.error_message + ")")
                        elif issubclass(ex.__class__, Exception):
                            if isinstance(ex, socket.timeout):
                                logging.info("CACHE: timed out calling " + self._getcall.__name__ +
                                             "(" + str(ex.status) + "," + ex.reason + "," + ex.error_message + ")")
                            else:
                                logging.info("CACHE: error out calling " + self._getcall.__name__ +
                                             "(" + str(ex.status) + "," + ex.reason + "," + ex.error_message + ")")
                    else:
                        self.values = values
                except:
                    logging.info("problem with cache get call!")
                    import traceback; import sys;
                    traceback.print_exc(file=sys.stdout)
            if firstRun or self._timer: # only start if timer not cancelled

                #logging.debug("CACHE: starting %s timer"%self.name);
                self._timer = threading.Timer(local_interval, self.__cache_load_callback__, [kwargs, interval, False])
                self._timer.start()
        except:
            traceback.print_exc(file=sys.stdout)
        finally: # free lock no matter what
            #logging.debug("CACHE: >>>>>>>>>>>>>>>> freeing %s timer lock"%self.name);
            self._timer_lock.release()

