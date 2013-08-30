// load balancers
//

define([
  './eucamodel'
], function(EucaModel) {
    var model = EucaModel.extend({
      idAttribute: 'name',
      validation: {
        name: {
          rangeLength: [1, 255],
          required: true
        }
      },

      sync: function(method, model, options) {
        var collection = this;
        if (method == 'create' || options.overrideUpdate == true) {
          var url = "/ec2?Action=CreateLoadBalancer";
          var params = "_xsrf="+$.cookie('_xsrf');
          params += "&LoadBalancerName="+model.get('name');
          if (model.get('scheme') != undefined) {
            params += "&Scheme="+model.get('scheme');
          }
          if (model.get('availability_zones') != undefined) {
            params += build_list_params("AvailabilityZones.member.", model.get('availability_zones'));
          }
          if (model.get('subnets') != undefined) {
            params += build_list_params("Subnets.member.", model.get('subnets'));
          }
          if (model.get('security_groups') != undefined) {
            params += build_list_params("SecurityGroups.member.", model.get('security_groups'));
          }
          if (model.get('listeners') != undefined) {
            params += build_list_params("Listeners.member.", model.get('listeners'));
            for (var index in model.get('listeners')) {
              i = parseInt(index)+1;
              item = items[index];
              params += "&Listeners.member."+i+".LoadBalancerPort="+item.load_balancer_port;
              params += "&Listeners.member."+i+".InstancePort="+item.instance_port;
              params += "&Listeners.member."+i+".Protocol="+item.protocol;
            }
          }
          return this.makeAjaxCall(url, params, options);
        } else if (method == 'delete') {
          var url = "/ec2?Action=DeleteLoadBalancer";
          var params = "_xsrf="+$.cookie('_xsrf');
          params += "&LoadBalancerName="+model.get('name');
          return this.makeAjaxCall(url, params, options);
        }
      }
    });
    return model;
});
