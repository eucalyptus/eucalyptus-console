#!/usr/bin/python

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

from uiproxyclient import UIProxyClient

if __name__ == "__main__":
    # make some calls to proxy class to test things out
    client = UIProxyClient()
    client.login('localhost', '8888', 'ui-test-acct-03', 'admin', 'mypassword6')
    print "=== Getting Launch Configurations ==="
    print client.get_all_launch_configurations()
    print "=== Create Launch Config ==="
    print client.create_launch_configuration('dak-lc', 'emi-C48640C0', instance_type='t1.micro',
                                             instance_monitoring='true')
    print client.get_all_launch_configurations()
    print "=== Getting Scaling Groups ==="
    print client.get_all_groups()
    print "=== Create Scaling Group ==="
    print client.create_auto_scaling_group('testscalegroup', 'testlaunchconfig', min_size=0, max_size=4,
                                           default_cooldown=555, zones=['cluster01'])
    print client.get_all_groups()
    print "=== Set Desired Capacity ==="
    print client.set_desired_capacity("testscalegroup", 2)
    print "=== Create Scaling Policy ==="
    print client.put_scaling_policy(
        {'name': 'testpolicy', 'as_name': 'testscalegroup', 'adjustment_type': 'ChangeInCapacity',
         'scaling_adjustment': '1', 'cooldown': '60'})
    print "=== Getting Scaling Policies ==="
    print client.get_all_policies()
    print "=== Executing Scaling Policy ==="
    print client.execute_policy('testpolicy')
    print "=== Delete Scaling Policy ==="
    print client.delete_policy('testpolicy')
    print "=== Getting Adjustment Types ==="
    print client.get_all_adjustment_types()
    print "=== Delete Scaling Group ==="
    print client.delete_auto_scaling_group("testscalegroup", force_delete=True)
    print "=== Getting Scaling Group Instances ==="
    print client.get_all_autoscaling_instances()
    print "=== Delete Launch Config ==="
    print client.delete_launch_configuration('testlaunchconfig')
