// scaling policy model
//

define([
  './eucamodel',
], function(EucaModel, app) {
  var model = EucaModel.extend({
    validation: {
      adjustment_type: {
        required: true,
        oneOf: ['ChangeInCapacity', 'ExactCapacity', 'PercentChangeInCapacity']
      },

      scaling_adjustment: {
        required: true,
        fn: function(val, att, comp) {
          regex = /^-?[0-9]+$/;
          if(!regex.test(val))
            return att + " must be a whole number.";
        }
      },

      name: {
        required: true,
        minLength: 1,
        maxLength: 255
      },

      as_name: {
        required: true,
        minLength: 1,
        maxLength: 1600
      }
    },

    idAttribute: 'name',
    sync: function(method, model, options){
      if(method == 'create' || method == 'update'){
        var url = "/autoscaling?Action=PutScalingPolicy";
        var name = model.get('name');
        var adjustment_type = model.get('adjustment_type');
        var as_name = model.get('as_name');
        var scaling_adjustment = model.get('scaling_adjustment');
        var cooldown = model.get('cooldown');
        var parameter = "_xsrf="+$.cookie('_xsrf');
        parameter += "&PolicyName="+name+"&AdjustmentType="+adjustment_type+"&AutoScalingGroupName="+as_name+"&ScalingAdjustment="+scaling_adjustment;
        if(cooldown != undefined){
          parameter += "&Cooldown="+cooldown;
        }
        return this.makeAjaxCall(url, parameter, options);
      }else if(method == 'delete'){
        var url = "/autoscaling?Action=DeletePolicy";
        var name = model.get('name');
        var as_name = model.get('as_name');
        var parameter = "_xsrf="+$.cookie('_xsrf');
        parameter += "&PolicyName="+name;
        parameter += "&AutoScalingGroupName="+as_name
        return this.makeAjaxCall(url, parameter, options);
      }
    },
    execute: function(as_group, honor_cooldown, options){
      var url = "/autoscaling?Action=ExecutePolicy";
      var parameter = "_xsrf="+$.cookie('_xsrf');
      if(as_group != undefined){
        parameter += "&AutoScalingGroupName="+as_group;
      }
      if(honor_cooldown != undefined){
        parameter += "&HonorCooldown="+honor_cooldown;
      }
      return this.makeAjaxCall(url, parameter, options);
    },
    // not sure if this returns things in a useful way. Might be nice to return a string array
    getAdjustmentTypes: function(options){
      var url = "/autoscaling?Action=DescribeAdjustmentTypes";
      var parameter = "_xsrf="+$.cookie('_xsrf');
      return this.makeAjaxCall(url, parameter, options);
    },
  });
  return model;
});
