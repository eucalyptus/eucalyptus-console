define([
  'app',
  'rivets',
  'text!./page1.html',
], function(app, rivets, template) {
    return Backbone.View.extend({
      title: app.msg('create_load_balancer_general'), 
      next: app.msg('create_scaling_group_btn_next_membership'),

      initialize: function(args) {
        var self = this;
        var scope = this.model;

        scope.set('loadBalancerErrors', new Backbone.Model());

        scope.on('change', function(model) {
            scope.validate(model.changed);
        });

        scope.on('validated', function(valid, model, errors) {
            scope.clear();
            _.each(_.keys(errors), function(key) { 
                scope.set(key, errors[key]);
                if(errors[key] == undefined) {
                  scope.unset(key); 
                }
            });
            self.trigger('validationchange', scope, 'sgerr');
        });

        $(this.el).html(template);
        this.rView = rivets.bind(this.$el, scope);
        //this.render();
      },

      render: function() {
        this.rView.sync();
        return this;
      },

      isValid: function() {
        // assert that this step is valid before "next" button works
        var errors = this.model.validate();
        var valid = this.model.isValid(['name']); 
        if(!valid)
            this.model.set(errors.pick('name'));
        return valid;
      }
    });
});
