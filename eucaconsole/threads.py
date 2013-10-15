# Copyright 2012 Eucalyptus Systems, Inc.
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

import functools
import logging
import threading
import eucaconsole
from tornado.ioloop import IOLoop


class Threads(object):
    max_threads = 1

    def __init__(self):
        self.max_threads = eucaconsole.config.getint("server", "threads.max")
        self.counter = threading.Semaphore(self.max_threads)

    @staticmethod
    def instance():
        if not hasattr(Threads, "_instance"):
            Threads._instance = Threads()
        return Threads._instance

    # This method kicks off a background thread calling the given target
    # and passing it the provided arguments, a tuple that should contain
    # kwargs dict and a callback function
    def runThread(self, target, args=(None, None,)):
        self.counter.acquire(True)
        t = threading.Thread(target=self.__thread_done_callback__, \
                             args=(target, args))
        t.setName(target.__name__)
        t.start()

    def __thread_done_callback__(self, target, args):
        target(args[0], args[1])
        self.counter.release()

    # This method is used to pass results back to the main thread for
    # response to the client
    def invokeCallback(self, callback, response):
        IOLoop.instance().add_callback(functools.partial(callback, response))

    def killEmAll(self):
        for t in threading.enumerate():
            if t.isAlive():
                try:
                    logging.debug("stopping thread :"+t.getName())
                    t._Thread__stop()
                except:
                    pass

#
# This class is an copy of the threading._Timer class, but allows for the backing
# thread to be named. To track the reamining threads, modify the threading.py file on your
# installation, replacing the name set call in the Thread.__init__() (like this):
#        #self.__name = str(name or _newname())
#        self.__name = str(name or target)
# This names the thread for the target, not the unhelpful (Thread-NN) value.
# enabling DEBUG in logging causes the thread killer at console termination to print the
# thread names out, so you can see what was running at that time.
#
class Timer(threading.Thread):
    def __init__(self, interval, function, args=[], kwargs={}, name=None):
        threading.Thread.__init__(self)
        if name:
            self.setName(name)
        self.interval = interval
        self.function = function
        self.args = args
        self.kwargs = kwargs
        self.finished = threading.Event()
        
    def cancel(self):
        """Stop the timer if it hasn't finished yet"""
        self.finished.set()

    def run(self):
        self.finished.wait(self.interval)
        if not self.finished.is_set():
            self.function(*self.args, **self.kwargs)
        self.finished.set()
        

