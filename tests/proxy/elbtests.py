#!/usr/bin/python
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

from boto.ec2.elb.healthcheck import HealthCheck
from uiproxyclient import UIProxyClient

if __name__ == "__main__":
    instance_id = 'i-2023dc50'
    # make some calls to proxy class to test things out
    client = UIProxyClient()
    client.login('localhost', '8888', 'ui-test-acct-03', 'admin', 'mypassword6')
    print "=== Getting Load Balancers ==="
    print client.get_all_load_balancers()
    print "=== Create Load Balancer ==="
    listener = '80', '8888', 'HTTP'
    print client.create_load_balancer('testbalancer', ['cluster01'], [listener])
    print client.get_all_load_balancers()
    print "=== Registering Instance ==="
    print client.register_instances('testbalancer', [instance_id])
    print "=== Configuring Health Check ==="
    print client.configure_health_check('testbalancer', HealthCheck(target='HTTP:80/hc/test'))
    print "=== Create LB liistener ==="
    listener = '2022', '8022', 'TCP'
    print client.create_load_balancer_listeners('testbalancer', [listener])
    print "=== Getting Instance Health ==="
    print client.describe_instance_health('testbalancer')
    print "=== Delete LB liistener ==="
    print client.delete_load_balancer_listeners('testbalancer', ['443'])
    print "=== Deregistering Instance ==="
    print client.deregister_instances('testbalancer', [instance_id])
    print "=== Delete Load Balancer ==="
    print client.delete_load_balancer('testbalancer')
