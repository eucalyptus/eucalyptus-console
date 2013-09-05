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

import base64
import logging
import urllib2
import xml.sax

import boto
from boto.sts.credentials import Credentials

import eucaconsole


class TokenAuthenticator(object):
    def __init__(self, host, duration):
        # make the call to STS service to authenticate with the CLC
        self.auth_url = "https://%s:8773/services/Tokens?Action=GetSessionToken&DurationSeconds=%d&Version=2011-06-15" % (
        host, duration)

    # raises EuiExcepiton for "Not Authorized" or "Timed out"
    def authenticate(self, account, user, passwd, new_passwd=None):
        try:
            req = urllib2.Request(self.auth_url)
            if new_passwd:
                auth_string = "%s@%s;%s@%s" % \
                              (base64.b64encode(user), \
                               base64.b64encode(account), \
                               base64.b64encode(passwd), \
                               new_passwd)
            else:
                auth_string = "%s@%s:%s" % \
                              (base64.b64encode(user), \
                               base64.b64encode(account), \
                               passwd)
            encoded_auth = base64.b64encode(auth_string)
            req.add_header('Authorization', "Basic %s" % encoded_auth)
            response = urllib2.urlopen(req, timeout=15)
            body = response.read()

            # parse AccessKeyId, SecretAccessKey and SessionToken
            creds = Credentials(None)
            h = boto.handler.XmlHandler(creds, None)
            xml.sax.parseString(body, h)
            logging.info("authenticated user: " + account + "/" + user)
            return creds
        except urllib2.URLError, err:
            # this returned for authorization problem
            # HTTP Error 401: Unauthorized
            # HTTP Error 403: Forbidden (when password has expired)
            if issubclass(err.__class__, urllib2.HTTPError):
                raise eucaconsole.EuiException(err.code, 'Not Authorized')
                # this returned for connection problem (i.e. timeout)
            # <urlopen error [Errno 61] Connection refused>
            if issubclass(err.__class__, urllib2.URLError):
                raise eucaconsole.EuiException(504, 'Timed out')

    # raises EuiExcepiton for "Not Authorized" or "Timed out"
    def authenticate_aws(self, package):
        try:
            logging.info("token request data: " + package)
            req = urllib2.Request('https://sts.amazonaws.com', package)
            response = urllib2.urlopen(req, timeout=20)
            body = response.read()

            # parse AccessKeyId, SecretAccessKey and SessionToken
            creds = Credentials(None)
            h = boto.handler.XmlHandler(creds, None)
            xml.sax.parseString(body, h)
            logging.info("authenticated aws user")
            return creds
        except urllib2.URLError, err:
            # this returned for authorization problem
            # HTTP Error 401: Unauthorized
            # HTTP Error 403: Forbidden (when password has expired)
            if issubclass(err.__class__, urllib2.HTTPError):
                raise eucaconsole.EuiException(err.code, 'Not Authorized')
                # this returned for connection problem (i.e. timeout)
            # <urlopen error [Errno 61] Connection refused>
            if issubclass(err.__class__, urllib2.URLError):
                raise eucaconsole.EuiException(504, 'Timed out')
        
