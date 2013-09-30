define(['app'], function(app) {
  return Backbone.Model.extend({
    
    initialize: function() {

    },

    validation: {
      min_count: {
        required: true,
        pattern: 'digits',
        min: 1,
        max: 99,
        msg: app.msg("launch_instance_error_number_required")
      },
    
      max_count: {
        required: true,
        pattern: 'digits',
        min: 1,
        max: 99,
        msg: app.msg("launch_instance_error_number_required")
      },

      instance_names: function(value, attr, computedState) {
          if(value) {
            var names = value.split(",");
            if (names.length != computedState.max_count) {
              return app.msg("launch_instance_error_name_number_inequality");
            }
          }
      },

      instance_type: {
        required: true,
        msg: app.msg("launch_instance_error_size_required")
      },
    },

    finish: function(outputModel) {
      outputModel.set('instance_type', this.get('instance_type'));
      var zone = this.get('zone');
      if (zone != 'Any') {
        outputModel.set('placement', zone);
      }
      outputModel.set('tags', this.get('tags'));

      outputModel.set('min_count', this.get('min_count'));
      outputModel.set('max_count', this.get('max_count'));
    }

  });
});
