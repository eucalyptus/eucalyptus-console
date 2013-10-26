# Copyright 2013 Eucalyptus Systems, Inc.
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


import ConfigParser

import eucaconsole
from .botoclcinterface import BotoClcInterface
from cache import Cache


class PublicData(object):
    def __init__(self, config):
        self.caches = {}
        self.regions = None
        pollfreq = config.getint('server', 'pollfreq')
        try:
            freq = config.getint('server', 'pollfreq.allimages')
        except ConfigParser.NoOptionError:
            freq = pollfreq
        self.all_images_freq = freq

        try:
            freq = config.getint('server', 'pollfreq.amazonimages')
        except ConfigParser.NoOptionError:
            freq = pollfreq
        self.amazon_images_freq = freq

    # called when new aws login happens to ensure we have freshest credentials to use
    def set_credentials(self, access_id, secret_key, token):
        if self.regions is None:
            clc = BotoClcInterface('ec2.us-east-1.amazonaws.com', access_id, secret_key, token)
            self.regions = clc.get_all_regions()

        for reg in self.regions:
            if reg.endpoint in self.caches.keys():
                # update connection objects' endpoints
                clc = BotoClcInterface(reg.endpoint, access_id, secret_key, token)
                self.caches[reg.endpoint]['connection'] = clc
                self.caches[reg.endpoint]['allimages']._getcall = clc.get_all_images
                self.caches[reg.endpoint]['amazonimages']._getcall = clc.get_amazon_images
            else:
                # create caches for region
                clc = BotoClcInterface(reg.endpoint, access_id, secret_key, token)
                cache = {
                    'connection': clc,
                    'allimages': Cache(
                        'allimages', self.all_images_freq,
                        clc.get_all_images, UserSessionMimic(PushWrapper(reg.endpoint))),
                    'amazonimages': Cache(
                        'amazonimages', self.amazon_images_freq,
                        clc.get_amazon_images, UserSessionMimic(PushWrapper(reg.endpoint)))
                }
                self.caches[reg.endpoint] = cache
                self.caches[reg.endpoint]['allimages'].start_timer({})
                self.caches[reg.endpoint]['amazonimages'].start_timer({})


class UserSessionMimic(object):
    def __init__(self, push):
        self.push_handler = push


class PushWrapper(object):
    def __init__(self, endpoint):
        self.endpoint = endpoint

    def send_msg(self, msg):
        for id in eucaconsole.sessions.keys():
            if eucaconsole.sessions[id].cloud_type == 'aws':
                # check to see if this is for the correct region first
                if eucaconsole.sessions[id].clc.get_endpoint() == self.endpoint:
                    #TODO: incur some random delay to space out subsequent fetches ?
                    eucaconsole.sessions[id].push_handler.send_msg(msg)

