define([
  'app',
  'rivets',
  'text!./page2.html',
], function(app, rivets, template) {
    return Backbone.View.extend({
      title: app.msg('create_load_balancer_healthcheck'), 
      next: app.msg('create_load_balancer_btn_create'),

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
        var errors = new Backbone.Model(this.scope.validate());
        //var valid = this.scope.isValid(['name']); 
        //if(!valid)
        //    this.model.set(errors.pick('name'));
        return true;// valid;
      }
    });
});
