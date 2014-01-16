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

import base64
import binascii
import ConfigParser
import os
import sys
import time
import traceback
import socket
import logging
import uuid
from datetime import datetime
from datetime import timedelta

import tornado.web

import eucaconsole
from .botoclcinterface import BotoClcInterface
from .botobalanceinterface import BotoBalanceInterface
from .botowatchinterface import BotoWatchInterface
from .botoscaleinterface import BotoScaleInterface
from token import TokenAuthenticator


class UserSession(object):
    clc = None
    walrus = None
    cw = None
    elb = None
    scaling = None
    push_handler = None

    def __init__(self, account, username, passwd, session_token, access_key, secret_key):
        self.obj_account = account
        self.obj_username = username
        self.obj_passwd = passwd
        self.obj_session_token = session_token
        self.obj_access_key = access_key
        self.obj_secret_key = secret_key
        self.obj_fullname = None
        self.session_start = time.time()
        self.session_last_used = time.time()
        self.session_lifetime_requests = 0
        self.keypair_cache = {}
        self.cloud_type = 'euca'

    def cleanup(self):
        # this is for cleaning up resources, like when the session is ended
        if self.clc != None:
            for res in self.clc.caches:
                self.clc.caches[res].cancel_timer()
        if self.cw != None:
            for res in self.cw.caches:
                self.cw.caches[res].cancel_timer()
        if self.elb != None:
            for res in self.elb.caches:
                self.elb.caches[res].cancel_timer()
        if self.scaling != None:
            for res in self.scaling.caches:
                self.scaling.caches[res].cancel_timer()

    @property
    def account(self):
        return self.obj_account

    @property
    def username(self):
        return self.obj_username

    @property
    def passwd(self):
        return self.obj_passwd

    @property
    def session_token(self):
        return self.obj_session_token

    @session_token.setter
    def session_token(self, val):
        self.obj_session_token = val

    @property
    def access_key(self):
        return self.obj_access_key

    @access_key.setter
    def access_key(self, val):
        self.obj_access_key = val

    @property
    def secret_key(self):
        return self.obj_secret_key

    @secret_key.setter
    def secret_key(self, val):
        self.obj_secret_key = val

    @property
    def host_override(self):
        return self.obj_host_override

    @host_override.setter
    def host_override(self, val):
        self.obj_host_override = val

    @property
    def fullname(self):
        return self.obj_fullname

    @fullname.setter
    def fullname(self, name):
        self.obj_fullname = name

    # return only the info that's to be sent to browsers
    def get_session(self):
        return {'account': self.account, 'username': self.username, 'fullname': self.fullname, 'host_override': self.host_override}


class GlobalSession(object):
    def __init__(self):
        self.instancetypes = ""

    def get_value(self, scope, key, default_val=None):
        value = None
        try:
            value = eucaconsole.config.get(scope, key)
        except Exception, err:
            value = default_val
        return value

    def list_items(self, scope):
        items = {}
        for k, v in eucaconsole.config.items(scope):
            items[k] = v
        return items

    def parse_instancetypes(self, instancetypes):
        self.instancetypes = {}
        for vmt in instancetypes:
            if isinstance(vmt, dict):
                self.instancetypes[vmt['name']] = [vmt['cores'], vmt['memory'], vmt['disk']]
            else:
                self.instancetypes[vmt.name] = [vmt.cores, vmt.memory, vmt.disk]

    @property
    def language(self):
        return self.get_value('locale', 'language')

    @property
    def version(self):
        return eucaconsole.__version__

    @property
    def admin_console_url(self):
        port = self.get_value('server', 'clcwebport', '8443')
        url = 'https://' + self.get_value('server', 'clchost')
        if port != '443':
            url += ':' + port
        return url

    @property
    def help_url(self):
        return self.get_value('locale', 'help.url')

    @property
    def admin_support_url(self):
        return self.get_value('locale', 'support.url')

    @property
    def instance_type(self):
        return self.instancetypes

    @property
    def ajax_timeout(self):
        timeout = self.get_value('server', 'ajax.timeout', '30000')
        return timeout

    # return the collection of global session info
    def get_session(self):
        return {
            'version': self.version,
            'language': self.language,
            'admin_console_url': self.admin_console_url,
            'help_url': self.help_url,
            'admin_support_url': self.admin_support_url,
            'instance_type': self.instance_type,
            'ajax_timeout': self.ajax_timeout,
        }

class EuiException(BaseException):
    def __init__(self, status_code, message):
        self.code = status_code
        self.msg = message

    @property
    def status_code(self):
        return self.code

    @status_code.setter
    def status_code(self, code):
        self.code = code

    @property
    def message(self):
        return self.msg

    @message.setter
    def message(self, msg):
        self.msg = msg


class CheckIpHandler(tornado.web.RequestHandler):
    def get(self):
        remote = self.request.remote_ip
        if remote == '::1':
            remote = '127.0.0.1'
        self.write(remote)


class BaseHandler(tornado.web.RequestHandler):
    user_session = None

    def should_use_mock(self):
        use_mock = eucaconsole.config.getboolean('test', 'usemock')
        return use_mock

    def authorized(self):
        try:
            sid = self.get_cookie("session-id")
        except:
            return False

        if not sid or sid not in eucaconsole.sessions:
            self.clear_cookie("session-id")
            self.clear_cookie("_xsrf")
            return False
        self.user_session = eucaconsole.sessions[sid]
        return True

    # this method is overriden from RequestHandler to set a secure cookie with https
    @property
    def xsrf_token(self):
        if not hasattr(self, "_xsrf_token"):
            token = self.get_cookie("_xsrf")
            if not token or token == '':
                token = binascii.b2a_hex(uuid.uuid4().bytes)
                # this test for a logged in session differs from tornado's user check
                expires_days = 30 if self.user_session is None else None
                if eucaconsole.using_ssl:
                    self.set_cookie("_xsrf", token, expires_days=expires_days, secure='yes')
                else:
                    self.set_cookie("_xsrf", token, expires_days=expires_days)
            self._xsrf_token = token
        return self._xsrf_token


class RootHandler(BaseHandler):
    def get(self, path):
        try:
            path = os.path.join(eucaconsole.config.get('paths', 'staticpath'), "index.html")
        except ConfigParser.Error:
            logging.info("Caught url path exception :" + path)
            path = '../static/index.html'
        self.set_header("X-Frame-Options", "DENY")
        self.set_header("Cache-control", "no-cache")
        self.set_header("Pragma", "no-cache")
        # EUCA-3704 set xsrf token for login (before session is created)
        token = self.xsrf_token
        self.render(path)

    def post(self, arg):
        response = None
        try:
            action = self.get_argument("action")
            if action == 'login' or action == 'changepwd' or action == 'awslogin':
                try:
                    response = LoginProcessor.post(self)
                except Exception, err:
                    traceback.print_exc(file=sys.stdout)
                    if isinstance(err, EuiException):
                        raise err
                    else:
                        raise EuiException(401, 'not authorized')
            elif action == 'init':
                try:
                    response = InitProcessor.post(self)
                except Exception, err:
                    traceback.print_exc(file=sys.stdout)
                    raise EuiException(401, 'not authorized')
            elif action == 'busy':
                if self.authorized():
                    self.user_session.session_last_used = time.time()
                    response = BusyResponse(self.user_session)
                else:
                    response = BusyResponse(None)
            else:
                if not self.authorized():
                    raise EuiException(401, 'not authorized')

                if action == 'session':
                    try:
                        response = SessionProcessor.post(self)
                    except Exception, err:
                        traceback.print_exc(file=sys.stdout)
                        raise EuiException(500, 'can\'t retrieve session info')
                elif action == 'logout':
                    try:
                        response = LogoutProcessor.post(self)
                    except Exception, err:
                        traceback.print_exc(file=sys.stdout)
                        raise EuiException(500, 'unknown error occured')
                else:
                    raise EuiException(500, 'unknown action')
        except EuiException, err:
            traceback.print_exc(file=sys.stdout)
            if err:
                raise tornado.web.HTTPError(err.status_code, err.message)
            else:
                raise tornado.web.HTTPError(500, 'unknown error occured')

        if not response:
            raise tornado.web.HTTPError(500, 'unknown error occured')

        self.write(response.get_response())

    def check_xsrf_cookie(self):
        action = self.get_argument("action")
        # EUCA-3704 don't give login and password change actions a pass any longer
        #if action == 'login' or action == 'init' or action == 'changepwd' or action == 'awslogin':
        if action == 'init':
            xsrf = self.xsrf_token
        else:
            super(RootHandler, self).check_xsrf_cookie()


class ProxyProcessor():
    @staticmethod
    def get(web_req):
        raise NotImplementedError("not supported")

    @staticmethod
    def post(web_req):
        raise NotImplementedError("not supported")


class LogoutProcessor(ProxyProcessor):
    @staticmethod
    def post(web_req):
        sid = web_req.get_cookie("session-id")
        if not sid or sid not in eucaconsole.sessions:
            return LogoutResponse();
        terminateSession(sid)
        web_req.clear_cookie("session-id")
        web_req.clear_cookie("_xsrf")
        return LogoutResponse();


def terminateSession(id, expired=False):
    msg = 'logged out'
    if expired:
        msg = 'session timed out'
        # notify the browser code of this event
        try:
            eucaconsole.sessions[id].push_handler.send_msg('session_expired')
        except:
            logging.warn("Exception trying to notify user of session timeout. Perhaps they closed the browser window?")
            pass
    logging.info("User %s after %d seconds" % (msg, (time.time() - eucaconsole.sessions[id].session_start)));
    logging.info("--Proxy processed %d requests during this session", eucaconsole.sessions[id].session_lifetime_requests)
    eucaconsole.sessions[id].cleanup()
    del eucaconsole.sessions[id] # clean up session info

def renewSessionToken(user_session):
    auth = TokenAuthenticator(eucaconsole.config.get('server', 'clchost'),
                              eucaconsole.config.getint('server', 'session.abs.timeout') + 60)
    creds = auth.authenticate(user_session.account,
                              user_session.username,
                              user_session.passwd)
    logging.info("refreshing session creds")
    user_session.session_token = creds.session_token
    user_session.access_id = creds.access_key
    user_session.secret_key = creds.secret_key
    # pass creds to all boto connections (not happy with doing all this here - dak)
    try:
        user_session.clc.clc = BotoClcInterface(user_session.clc.clc.get_endpoint(), creds.access_key,
                                                creds.secret_key, creds.session_token)
        user_session.cw.cw = BotoWatchInterface(user_session.cw.cw.get_endpoint(), creds.access_key,
                                                creds.secret_key, creds.session_token)
        user_session.scaling.scaling = BotoScaleInterface(user_session.scaling.scaling.get_endpoint(), creds.access_key,
                                                creds.secret_key, creds.session_token)
        user_session.elb.bal = BotoBalanceInterface(user_session.elb.bal.get_endpoint(), creds.access_key,
                                                creds.secret_key, creds.session_token)
        # update all cache refresh calls.. (so ugly.. not pleased with this code - dak)
        for key in user_session.clc.caches:
            user_session.clc.caches[key].updateConnection(user_session.clc.clc)
        for key in user_session.cw.caches:
            user_session.cw.caches[key].updateConnection(user_session.cw.cw)
        for key in user_session.scaling.caches:
            user_session.scaling.caches[key].updateConnection(user_session.scaling.scaling)
        for key in user_session.elb.caches:
            user_session.elb.caches[key].updateConnection(user_session.elb.bal)
    except Exception, err:
        logging.error(err)

class LoginProcessor(ProxyProcessor):
    @staticmethod
    def post(web_req):
        action = web_req.get_argument("action")
        if action == 'awslogin':
            package = web_req.get_argument('package')
            package = base64.decodestring(package)
            auth = TokenAuthenticator("", 0)    #values not used here
            creds = auth.authenticate_aws(package)
            session_token = creds.session_token
            access_id = creds.access_key
            secret_key = creds.secret_key
            account = "aws"
            user = creds.access_key
            passwd = ''
            eucaconsole.public_data.set_credentials(access_id, secret_key, session_token)
        else:
            auth_hdr = web_req.get_argument('Authorization')
            if not auth_hdr:
                raise NotImplementedError("auth header not found")
            auth_decoded = base64.decodestring(auth_hdr)
            newpwd = None
            if action == 'changepwd':
                # fetch/decode old/new passwords
                account, user, passwd, newpwd = auth_decoded.split(':', 3)
                passwd = base64.decodestring(passwd)
                newpwd = base64.decodestring(newpwd)
                remember = 'yes' if (web_req.get_cookie("remember") == 'yes') else 'no';
            else:
                account, user, passwd = auth_decoded.split(':', 2);
                remember = web_req.get_argument("remember")

            if eucaconsole.config.getboolean('test', 'usemock') == False:
                auth = TokenAuthenticator(eucaconsole.config.get('server', 'clchost'),
                                          eucaconsole.config.getint('server', 'session.abs.timeout') + 60)
                creds = auth.authenticate(account, user, passwd, newpwd)
                session_token = creds.session_token
                access_id = creds.access_key
                secret_key = creds.secret_key
            else:
                # assign bogus values so we never mistake them for the real thing (who knows?)
                session_token = "Larry"
                access_id = "Moe"
                secret_key = "Curly"

        # create session and store info there, set session id in cookie
        while True:
            sid = os.urandom(16).encode('hex')
            if sid in eucaconsole.sessions:
                continue
            break
        if action == 'changepwd' and web_req.get_cookie("session-id") != None:
            # replace old session id
            old_sid = web_req.get_cookie("session-id")
            eucaconsole.sessions[sid] = eucaconsole.sessions[old_sid]
            del eucaconsole.sessions[old_sid]
        else:
            if action != 'awslogin':
                if remember == 'yes':
                    expiration = datetime.now() + timedelta(days=180)
                    web_req.set_cookie("account", account, expires=expiration)
                    web_req.set_cookie("username", user, expires=expiration)
                    web_req.set_cookie("remember", 'true' if remember else 'false', expires=expiration)
                else:
                    web_req.clear_cookie("account")
                    web_req.clear_cookie("username")
                    web_req.clear_cookie("remember")
            eucaconsole.sessions[sid] = UserSession(account, user, passwd, session_token, access_id, secret_key)
            eucaconsole.sessions[sid].host_override = 'ec2.us-east-1.amazonaws.com' if action == 'awslogin' else None
        if eucaconsole.using_ssl:
            web_req.set_cookie("session-id", sid, secure='yes')
        else:
            web_req.set_cookie("session-id", sid)
        if action == 'awslogin':
            eucaconsole.sessions[sid].cloud_type = 'aws'

        # setup the session info before setting up a new xsrf cookie below
        # that way, the new cookie will be setup properly..session expiration
        web_req.user_session = eucaconsole.sessions[sid]

        # EUCA-3704 refresh xsrf token on login or password change (unclear why this doesn't work...)
        #web_req.clear_cookie("_xsrf")
        # can't trust clear_cookie() to actually do it right away, forcing it instead.
        web_req.request.cookies["_xsrf"] = ''
        del web_req._xsrf_token
        token = web_req.xsrf_token

        return LoginResponse(eucaconsole.sessions[sid])


class InitProcessor(ProxyProcessor):
    @staticmethod
    def post(web_req):
        language = eucaconsole.config.get('locale', 'language')
        support_url = eucaconsole.config.get('locale', 'support.url')
        port = '8443'
        try:
            port = eucaconsole.config.get('server', 'clcwebport')
        except Exception, err:
            pass
        aws_enabled = False
        aws_def_region = 'us-east-1'
        session_duration = 3600
        try:
            aws_enabled = eucaconsole.config.getboolean('aws', 'enable.aws')
            aws_def_region = eucaconsole.config.get('aws', 'default.region')
            session_duration = eucaconsole.config.getint('server', 'session.abs.timeout') + 60
        except Exception, err:
            pass
        try:
            last_region = web_req.get_cookie('aws.region')
        except:
            pass
        if last_region:
            aws_def_region = last_region
        admin_url = 'https://' + eucaconsole.config.get('server', 'clchost')
        if port != '443':
            admin_url += ':' + port
        return InitResponse(language, support_url, admin_url, aws_enabled=aws_enabled,
                            aws_session_duration=session_duration, aws_def_region=aws_def_region)


class SessionProcessor(ProxyProcessor):
    @staticmethod
    def post(web_req):
        return LoginResponse(web_req.user_session)


class ProxyResponse(object):
    def __init__(self):
        pass

    def get_response(self):
        raise NotImplementedError("Should have implemented this")


class LogoutResponse(ProxyResponse):
    def __init__(self):
        pass

    def get_response(self):
        return {'result': 'success'}


class LoginResponse(ProxyResponse):
    def __init__(self, session):
        self.user_session = session
        self.awslogin = session.host_override is not None

    def get_response(self):
        if not eucaconsole.global_session:
            eucaconsole.global_session = GlobalSession()

        instancetypes = []
        use_mock = eucaconsole.config.getboolean('test', 'usemock')
        if self.awslogin or use_mock:
            instancetypes.append(dict(name='t1.micro', cores='1', memory='256', disk='5'))
            instancetypes.append(dict(name='m1.small', cores='1', memory='256', disk='5'))
            instancetypes.append(dict(name='m1.medium', cores='1', memory='512', disk='10'))
            instancetypes.append(dict(name='m1.large', cores='2', memory='512', disk='10'))
            instancetypes.append(dict(name='c1.medium', cores='2', memory='512', disk='10'))
            instancetypes.append(dict(name='m1.xlarge', cores='2', memory='1024', disk='10'))
            instancetypes.append(dict(name='c1.xlarge', cores='2', memory='2048', disk='10'))
            instancetypes.append(dict(name='m2.xlarge', cores='2', memory='2048', disk='10'))
            instancetypes.append(dict(name='m3.xlarge', cores='4', memory='2048', disk='15'))
            instancetypes.append(dict(name='m3.2xlarge', cores='4', memory='4096', disk='30'))
            instancetypes.append(dict(name='m2.4xlarge', cores='8', memory='4096', disk='60'))
            instancetypes.append(dict(name='hi1.4xlarge', cores='8', memory='6144', disk='120'))
            instancetypes.append(dict(name='cc2.8xlarge', cores='16', memory='6144', disk='120'))
            instancetypes.append(dict(name='cg1.4xlarge', cores='16', memory='12288', disk='200'))
            instancetypes.append(dict(name='cr1.8xlarge', cores='16', memory='16384', disk='240'))
            instancetypes.append(dict(name='hs1.8xlarge', cores='48', memory='119808', disk='24000'))
        else:
            #boto.set_stream_logger('foo')
            host = eucaconsole.config.get('server', 'clchost')
            clc = BotoClcInterface(host, self.user_session.access_key,
                                   self.user_session.secret_key,
                                   self.user_session.session_token)
            instancetypes = clc.get_all_instancetypes()
        eucaconsole.global_session.parse_instancetypes(instancetypes)

        return {'global_session': eucaconsole.global_session.get_session(),
                'user_session': self.user_session.get_session()}


class BusyResponse(ProxyResponse):
    def __init__(self, session):
        self.user_session = session

    def get_response(self):
        if self.user_session:
            return {'result': 'true'}
        else:
            return {'result': 'false'}


class InitResponse(ProxyResponse):
    def __init__(self, lang, support_url, admin_url, ip='', hostname='', aws_enabled=False, aws_session_duration=3600, aws_def_region='us-east-1'):
        self.language = lang
        self.support_url = support_url
        self.admin_url = admin_url
        self.ip = ip
        self.hostname = hostname
        self.aws_login_enabled = aws_enabled
        self.aws_session_duration = aws_session_duration
        self.aws_def_region = aws_def_region

    def get_response(self):
        return {'language': self.language, 'support_url': self.support_url, 'admin_url': self.admin_url,
                'ipaddr': self.ip, 'hostname': self.hostname,
                'aws_login_enabled': 'true' if self.aws_login_enabled else 'false',
                'aws_session_duration': str(self.aws_session_duration),
                'aws_def_region': self.aws_def_region}

