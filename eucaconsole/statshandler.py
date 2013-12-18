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

import logging
import threading
import time
import eucaconsole

class StatsHandler(eucaconsole.session.BaseHandler):
    url = '/serverstats'
    last_time = 0.0

    def get(self):
        ret = "<html><body>"
        if (time.time() - StatsHandler.last_time) < 5.0:
            ret += "<h2>Will only process one request every 5 seconds. Try again soon</h2>"
        else:
            ret += "<h3>Threads</h3><table border='1'><tr><th>name</th><th>alive</th></tr>"
            for t in threading.enumerate():
                ret += "<tr><td>%s</td><td>%s</td></tr>"%(t.getName(),str(t.isAlive()))
            ret += "</table>"
            ret += "<h4>active = %d</h4>" % threading.activeCount()
            ret += "<h3>Sessions</h3><table border='1'><tr><th>who</th><th>start</th><th>age</th><th>type</th></tr>"
            for key in eucaconsole.sessions.keys():
                s = eucaconsole.sessions[key]
                ret += "<tr><td>%s/%s</td><td>%s</td><td>%d</td><td>%s</td></tr>"%\
                     (s.account, s.username, time.ctime(s.session_start),\
                     (time.time() - s.session_start), s.cloud_type)
            ret += "</table>"
            ret += "<h4>active = %d</h4>" % len(eucaconsole.sessions)
            StatsHandler.last_time = time.time()
        ret += "</body></html>"
        self.set_header("X-Frame-Options", "DENY")
        self.set_header("Cache-control", "no-cache")
        self.set_header("Pragma", "no-cache")
        self.write(ret)
        self.finish()
