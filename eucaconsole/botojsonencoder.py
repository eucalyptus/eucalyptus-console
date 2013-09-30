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

import copy
from datetime import datetime
import logging
from json import JSONEncoder
from json import JSONDecoder

import boto
from boto.ec2.connection import EC2Connection
from boto.ec2.ec2object import EC2Object
from boto.regioninfo import RegionInfo
from boto.ec2.instance import Instance
from boto.ec2.blockdevicemapping import BlockDeviceType
from boto.ec2.image import Image
from boto.ec2.image import ImageAttribute
from boto.ec2.instance import ConsoleOutput
from boto.ec2.instance import Group
from boto.ec2.instanceinfo import InstanceInfo
from boto.ec2.cloudwatch import CloudWatchConnection
from boto.ec2.cloudwatch.dimension import Dimension
from boto.ec2.cloudwatch.metric import Metric
from boto.ec2.cloudwatch.alarm import MetricAlarm
from boto.ec2.autoscale import AutoScaleConnection
from boto.ec2.autoscale.launchconfig import BlockDeviceMapping
from boto.ec2.autoscale.launchconfig import Ebs
from boto.ec2.autoscale.launchconfig import LaunchConfiguration
from boto.ec2.autoscale.launchconfig import InstanceMonitoring
from boto.ec2.autoscale.request import Request
from boto.ec2.autoscale.group import AutoScalingGroup
from boto.ec2.autoscale.group import EnabledMetric
from boto.ec2.autoscale.group import SuspendedProcess
from boto.ec2.autoscale.policy import Alarm
from boto.ec2.autoscale.policy import AdjustmentType
from boto.ec2.autoscale.policy import ScalingPolicy
from boto.ec2.autoscale.activity import Activity
from boto.ec2.elb import ELBConnection
from boto.ec2.elb.loadbalancer import LoadBalancer
from boto.ec2.elb.healthcheck import HealthCheck
from boto.ec2.elb.listener import Listener
from boto.ec2.elb.policies import Policies
from boto.ec2.elb.securitygroup import SecurityGroup
from boto.ec2.elb.instancestate import InstanceState

# these things came in with boto 2.6
try:
    from boto.ec2.instance import InstanceState
    from boto.ec2.instance import InstancePlacement
except ImportError:
    pass
from boto.ec2.tag import Tag
from boto.ec2.securitygroup import GroupOrCIDR
from boto.ec2.securitygroup import IPPermissions
from boto.ec2.volume import AttachmentSet
from boto.s3.bucket import Bucket
from .response import ClcError
from .response import Response


class BotoJsonEncoder(JSONEncoder):

    # former wrapper for escaping code
    def __sanitize_and_copy__(self, dict):
        return copy.copy(dict)

    def default(self, obj):
        if isinstance(obj, boto.ec2.instance.Instance):
            values = self.__sanitize_and_copy__(obj.__dict__)
            return (values)
        elif isinstance(obj, Image):
            values = self.__sanitize_and_copy__(obj.__dict__)
            #print "image before :"+str(values)
            if 'billing_products' in values:
                del values['billing_products']
            del values['product_codes']
            #del values['connection']
            #del values['region']
            del values['item']
            del values['tags']
            del values['ownerId']
            if values['name'] == None:
              del values['name']
            if values['description'] == None:
              del values['description']
            if values['platform'] == None:
              del values['platform']
            if values['root_device_name'] == None:
              del values['root_device_name']
            if values['owner_alias'] == None:
              del values['owner_alias']
            if values['instance_lifecycle'] == None:
              del values['instance_lifecycle']
            if values['kernel_id'] == None:
              del values['kernel_id']
            if values['ramdisk_id'] == None:
              del values['ramdisk_id']
            #print "image after :"+str(values)
            return (values)
        elif issubclass(obj.__class__, EC2Object):
            values = self.__sanitize_and_copy__(obj.__dict__)
            return (values)
        elif isinstance(obj, RegionInfo):
            values = self.__sanitize_and_copy__(obj.__dict__)
            values['connection'] = None
            values['connection_cls'] = None
            return (values)
        elif isinstance(obj, ClcError):
            return self.__sanitize_and_copy__(obj.__dict__)
        elif isinstance(obj, Response):
            return obj.__dict__
        elif isinstance(obj, EC2Connection):
            return []
        elif isinstance(obj, Group):
            values = self.__sanitize_and_copy__(obj.__dict__)
            return (values)
        elif isinstance(obj, ConsoleOutput):
            values = self.__sanitize_and_copy__(obj.__dict__)
            return (values)
        elif isinstance(obj, ImageAttribute):
            values = self.__sanitize_and_copy__(obj.__dict__)
            return (values)
        elif isinstance(obj, AttachmentSet):
            values = self.__sanitize_and_copy__(obj.__dict__)
            return (values)
        elif isinstance(obj, IPPermissions):
            values = self.__sanitize_and_copy__(obj.__dict__)
            # this is because I found a "parent" property set to self - dak
            values['parent'] = None
            return (values)
        elif isinstance(obj, GroupOrCIDR):
            values = self.__sanitize_and_copy__(obj.__dict__)
            return (values)
        elif isinstance(obj, BlockDeviceType):
            values = self.__sanitize_and_copy__(obj.__dict__)
            values['connection'] = None
            return (values)
        elif isinstance(obj, Tag):
            values = self.__sanitize_and_copy__(obj.__dict__)
            return (values)
        if isinstance(obj, InstanceState):
            values = self.__sanitize_and_copy__(obj.__dict__)
            return (values)
        elif isinstance(obj, InstancePlacement):
            values = self.__sanitize_and_copy__(obj.__dict__)
            return (values)
        return super(BotoJsonEncoder, self).default(obj)

#        try:
#        except TypeError:
#            if obj.__dict__:
#                return obj.__dict__
#            else:
#                return []

class BotoJsonStorageEncoder(JSONEncoder):
    def default(self, obj):
        if issubclass(obj.__class__, EC2Object):
            values = copy.copy(obj.__dict__)
            return (values)
        elif isinstance(obj, RegionInfo):
            return []
        elif isinstance(obj, ClcError):
            return copy.copy(obj.__dict__)
        elif isinstance(obj, Response):
            return obj.__dict__
        elif isinstance(obj, CloudWatchConnection):
            return []
        elif isinstance(obj, Bucket):
            values = {'name': obj.name}
            return (values)
        return super(BotoJsonWatchEncoder, self).default(obj)


class BotoJsonWatchEncoder(JSONEncoder):
    def default(self, obj):
        if issubclass(obj.__class__, EC2Object):
            values = copy.copy(obj.__dict__)
            return (values)
        elif isinstance(obj, RegionInfo):
            return []
        elif isinstance(obj, ClcError):
            return copy.copy(obj.__dict__)
        elif isinstance(obj, Response):
            return obj.__dict__
        elif isinstance(obj, CloudWatchConnection):
            return []
        elif isinstance(obj, Dimension):
            values = copy.copy(obj.__dict__)
            return (values)
        elif isinstance(obj, MetricAlarm):
            values = copy.copy(obj.__dict__)
            return (values)
        elif isinstance(obj, Metric):
            values = copy.copy(obj.__dict__)
            return (values)
        return super(BotoJsonWatchEncoder, self).default(obj)


class BotoJsonBalanceEncoder(JSONEncoder):
    def default(self, obj):
    #        print obj.__class__.__name__
    #        print obj.__dict__.keys()
        if issubclass(obj.__class__, EC2Object):
            values = copy.copy(obj.__dict__)
            return (values)
        elif isinstance(obj, RegionInfo):
            return []
        elif isinstance(obj, ClcError):
            return copy.copy(obj.__dict__)
        elif isinstance(obj, Response):
            return obj.__dict__
        elif isinstance(obj, ELBConnection):
            return []
        elif isinstance(obj, LoadBalancer):
            values = copy.copy(obj.__dict__)
            values['connection'] = None
            return (values)
        elif isinstance(obj, HealthCheck):
            values = copy.copy(obj.__dict__)
            values['access_point'] = None
            return (values)
        elif isinstance(obj, Listener):
            values = copy.copy(obj.__dict__)
            return (values)
        elif isinstance(obj, Policies):
            values = copy.copy(obj.__dict__)
            values['connection'] = None
            return (values)
        elif isinstance(obj, SecurityGroup):
            values = copy.copy(obj.__dict__)
            return (values)
        elif isinstance(obj, boto.ec2.elb.InstanceState):
            values = copy.copy(obj.__dict__)
            return (values)
        elif isinstance(obj, InstanceInfo):
            values = copy.copy(obj.__dict__)
            return (values)
        return super(BotoJsonBalanceEncoder, self).default(obj)


class BotoJsonScaleEncoder(JSONEncoder):
    def default(self, obj):
        if issubclass(obj.__class__, EC2Object):
            values = copy.copy(obj.__dict__)
            return (values)
        elif isinstance(obj, RegionInfo):
            return []
        elif isinstance(obj, ClcError):
            return copy.copy(obj.__dict__)
        elif isinstance(obj, Response):
            return obj.__dict__
        elif isinstance(obj, AutoScaleConnection):
            return []
        elif isinstance(obj, datetime):
            return (obj.isoformat())
        elif isinstance(obj, AutoScalingGroup):
            values = copy.copy(obj.__dict__)
            return (values)
        elif isinstance(obj, EnabledMetric):
            values = copy.copy(obj.__dict__)
            return (values)
        elif isinstance(obj, SuspendedProcess):
            values = copy.copy(obj.__dict__)
            return (values)
        elif isinstance(obj, BlockDeviceMapping):
            values = copy.copy(obj.__dict__)
            return (values)
        elif isinstance(obj, Ebs):
            values = copy.copy(obj.__dict__)
            values['connection'] = None
            return (values)
        elif isinstance(obj, LaunchConfiguration):
            values = copy.copy(obj.__dict__)
            return (values)
        elif isinstance(obj, boto.ec2.autoscale.Instance):
            values = copy.copy(obj.__dict__)
            values['connection'] = None
            return (values)
        elif isinstance(obj, Request):
            values = copy.copy(obj.__dict__)
            values['connection'] = None
            return (values)
        elif isinstance(obj, InstanceMonitoring):
            values = copy.copy(obj.__dict__)
            values['connection'] = None
            return (values)
        elif isinstance(obj, ScalingPolicy):
            values = copy.copy(obj.__dict__)
            return (values)
        elif isinstance(obj, Alarm):
            values = copy.copy(obj.__dict__)
            return (values)
        elif isinstance(obj, AdjustmentType):
            values = copy.copy(obj.__dict__)
            return (values)
        elif isinstance(obj, Activity):
            values = copy.copy(obj.__dict__)
            return (values)
        elif isinstance(obj, boto.ec2.autoscale.tag.Tag):
            values = copy.copy(obj.__dict__)
            values['name'] = values['key']
            return (values)
        return super(BotoJsonScaleEncoder, self).default(obj)


class BotoJsonDecoder(JSONDecoder):
    # if we need to map classes to specific boto objects, we'd do that here
    # it seems like we can get away with generic objects for now.
    # regioninfo isn't used, so we just show this for an example
    def default(self, obj):
        if obj['__obj_name__'] == 'RegionInfo':
            ret = RegionInfo()
