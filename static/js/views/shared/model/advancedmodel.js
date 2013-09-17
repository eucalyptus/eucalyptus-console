define(['app'], function(app) {
  return Backbone.Model.extend({
    kernel_id: null,
    ramdisk_id: null,
    user_data: null,
    instance_monitoring: true,
    private_network: false,

    validation: {
      user_data: {
        required: false,
        maxLength: 16384,
        msg: app.msg('launch_instance_error_user_data_big')
      },
      fileinput: function(value, attr, computedState) {
        if (computedState != undefined && computedState.files != undefined) {
          if (computedState.files[0].size > 16384) {
            return app.msg('launch_instance_error_user_data_big');
          }
        }
        return;
      }
    },

    initialize: function() {
    },

    finish: function(outputModel) {
      this.set('monitoring_enabled', this.get('instance_monitoring'));
      this.set('addressing_type', (this.get('private_network')) ? 'private' : 'public');
      outputModel.set(this.toJSON());
    }
  });
});
