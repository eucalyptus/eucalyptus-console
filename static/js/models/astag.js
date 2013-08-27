define(['./tag'], function(Tag) {
  return Tag.extend({
    /* http://docs.aws.amazon.com/AutoScaling/latest/APIReference/API_TagDescription.html */

    sync: function(method, model, options) {
      if (method == 'create' || method == 'update') {
        return this.syncMethod_Create(model, options);
      }
      else if (method == 'delete') {
        return this.syncMethod_Delete(model, options);
      }
    },

    syncMethod_Create: function(model, options){
      /* Autoscaling tags are coming from the proxy with 'resource_id', which is what AWS says,
      * but ec2 tags are coming from the proxy with 'res_id' - not what AWS says.
      * The following munge and the parse function below are here to try to mitigate confusion and allow existing
      * tools to work with either tag now or if the proxy results change someday. */
      if (model.get('res_id') == undefined && model.get('resource_id') == undefined) {
        return;
      }
      var resource_id = model.get('res_id') ? model.get('res_id') : model.get('resource_id');

      var data = "_xsrf="+$.cookie('_xsrf');
      data += "&Tags.member.1.ResourceType=auto_scaling_group";
      data += "&Tags.member.1.ResourceId.1=" + resource_id;
      data += "&Tags.member.1.Key="+encodeURIComponent(model.get('name'));
      data += "&Tags.member.1.Value="+encodeURIComponent(model.get('value'));
      data += "&Tags.member.1.PropagateAtLaunch="+model.get('propagate_at_launch');

      return this.makeAjaxCall("/autoscaling?Action=CreateOrUpdateTags", data, options);
    },

    syncMethod_Delete: function(model, options){
     if (model.get('res_id') == undefined && model.get('resource_id') == undefined) {
        return;
      }
      var resource_id = model.get('res_id') ? model.get('res_id') : model.get('resource_id');

      var data = "_xsrf="+$.cookie('_xsrf');
      data += "&Tags.member.1.ResourceType=auto-scaling-group";
      data += "&Tags.member.1.ResourceId=" + resource_id;
      data += "&Tags.member.1.Key="+encodeURIComponent(model.get('name'));
      data += "&Tags.member.1.Value="+encodeURIComponent(model.get('value'));
      return this.makeAjaxCall("/autoscaling?Action=DeleteTags", data, options);
    },

    makeAjaxCall: function(url, param, options){
      var xhr = options.xhr = $.ajax({
        url: url,
        data: param,
        dataType: "json",
        async: true,
      }).done(options.success)
      .fail(options.error)

      this.trigger('request', this, xhr, options);

      return xhr;
    },
     

    parse: function(response) {
      response.res_id = response.resource_id;
      return resource;
    }
  });
});
