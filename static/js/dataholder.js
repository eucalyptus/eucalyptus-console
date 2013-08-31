define([
    'underscore',
    'backbone',
    'sharedtags',
    'models/scalinggrps',
	'models/scalinginsts',
	'models/scalingpolicys',
	'models/volumes',
	'models/images',
	'models/allimages',
	'models/launchconfigs',
	'models/instances',
	'models/addresses',
	'models/keypairs',
	'models/sgroups',
	'models/snapshots',
	'models/balancers',
	'models/insthealths',
	'models/summarys',
	'models/alarms',
	'models/metrics',
    'models/availabilityzones',
    'models/loadbalancers',
    'models/regions',
    'models/astags'
	], 
function(_, Backbone, tags) {
    var self = this;
    var sconfs = [
    ['scalinggrps', 'scalinggroup', 'scalingGroup', 'scalingGroups'],
	['scalinginst', 'scalinginsts'],
	['scalingpolicy', 'scalingpolicys'],
	['volume', 'volumes'],
	['image', 'images'],
	['allimages'],
	['launchconfig', 'launchconfigs', 'launchConfigs'],
	['instance', 'instances'],
	['address', 'addresses'],
	['keypair', 'keypairs'],
	['sgroup', 'sgroups'],
	['snapshot', 'snapshots'],
	['balancer', 'loadbalancers'],
	['insthealth', 'instHealths'],
	['summarys'],
	['alarm', 'alarms'],
	['metrics'],
	['availabilityzone'],
	['loadbalancer', 'loadbalancers'],
    ['regions'],
    ['astags']
    ];

    var shared = {};
    var args = arguments;
    var srcs = _.map(_.range(3, args.length), function(n) { 
        return args[n]; 
    });

    _.each(srcs, function(src, index) {
       var clz = srcs[index];
       var obj = new clz();
       _.each(sconfs[index], function(name) {
           shared[name] = obj;
       });
    });

    shared.tags = tags;
    shared.tag = tags;

	return shared;
});
