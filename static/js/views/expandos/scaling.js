define([
  'app',
  './eucaexpandoview',
  'text!./scaling.html!strip',
], function(app, EucaExpandoView, template) {
  return EucaExpandoView.extend({
    initialize : function(args) {
      var self = this;
      this.template = template;
      var tmp = this.model ? this.model : new Backbone.Model();
      this.model = new Backbone.Model();
      this.model.set('group', tmp);

      this.listenTo(tmp, "change", this.updateCount);
      this.updateCount();

      this.listenTo(app.data.scalingpolicys, "change add remove sync reset", this.updatePolicies);
      this.updatePolicies();

      this.scope = this.model;
      this.listenTo(this.model.get('group').get('tags'), 'add remove change reset sync', function() {
        self.render();
      });
      this._do_init();
    },

    updateCount: function() {
      if (this.model.get('group').get('instances')) {
        this.model.set('current', this.model.get('group').get('instances').length);
      }
      else {
        this.model.set('current', '0');
      }
      this.try_render();
    },

    updatePolicies: function() {
      var policies = app.data.scalingpolicys.where({as_name:this.model.get('group').get('name')}); 
      var self = this;
      _.each(policies, function(p) {
        self.addDisplay(p);
      });
      this.model.set('policies', policies);
      this.try_render();
    },

    // this code is duplicated in the policy editor (vews/ui/editpolicies/index.js)
    addDisplay: function(model) {
      if(model.get('adjustment_type') == 'PercentChangeInCapacity') {
        model.set('measure', $.i18n.prop('create_scaling_group_policy_measure_percent'));
      } else {
        model.set('measure', $.i18n.prop('create_scaling_group_policy_measure_instance'));
      }

      if(model.get('adjustment_type') == 'ExactCapacity') {
        model.set('action', 'SETSIZE');
        model.set('amount', model.get('scaling_adjustment'));
      } else {
        if(model.get('scaling_adjustment') < 0) {
          model.set('action', 'SCALEDOWNBY');
          model.set('amount', model.get('scaling_adjustment') * -1);
        } else {
          model.set('action', 'SCALEUPBY');
          model.set('amount', model.get('scaling_adjustment'));
        }
      }

      var disp_action = '';
      switch (model.get('action')) {
        case 'SCALEUPBY': disp_action = 'create_scaling_group_policy_action_scale_up'; break;
        case 'SCALEDOWNBY': disp_action = 'create_scaling_group_policy_action_scale_down'; break;
        case 'SETSIZE': disp_action = 'create_scaling_group_policy_action_set_size'; break;
      }
      model.set('display_action', $.i18n.prop(disp_action));

      if(model.get('alarms')) {
        model.set('alarm_name', model.get('alarms')[0].name);
      }
    },
  });
});
