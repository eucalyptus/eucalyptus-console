define([
  'app',
  'backbone',
  'rivets',
  'text!./page3.html',
], function(app, Backbone, rivets, template) {
        return Backbone.View.extend({
          title: app.msg('create_scaling_group_section_header_policies'),
          next: app.msg('create_scaling_group_btn_create'), 

          initialize: function() {
            var self = this;

            var scope = new Backbone.Model({
                scalingGroup: this.model.get('scalingGroup'),
                alarms: this.model.get('alarms'),
                policies: new Backbone.Model({
                    scalingGroup: this.model.get('scalingGroup'),
                    alarms: this.model.get('alarms'),
                    error: new Backbone.Model(),
                    available: new Backbone.Collection(),
                    selected: self.model.get('policies'),
                    getId: function(item) {
                        return item;
                    },
                    getValue: function(item) {
                        return item;
                    }
                })
            });
            this.scope = scope;

            //ensure as_name is set for edits
            if(self.model.get('scalingGroup')) {
              scope.get('policies').set('as_name', self.model.get('scalingGroup').get('name'));
            }

            $(this.el).html(template);
            this.rview = rivets.bind(this.$el, scope);
           
            this.listenTo(this.model.get('scalingGroup'), 'change:name', function(model, value) {
              scope.get('policies').set('as_name', value);
              // change all existing policies
              scope.get('policies').get('selected').each(function(pol) {
                pol.set('as_name', value);
              });
            });

            this.listenTo(scope.get('policies').get('error'), 'change', function(err) {
              self.trigger('validationchange', err, 'polerr')
            });
              
          },

          finish: function() {
            // force editor to save entered policy not yet added
            this.scope.get('policies').get('selected').trigger('confirm');
          },

          focus: function() {
            this.model.get('scalingGroup').set('showPage3', true);
          },


          render: function() {
            this.rview.sync();
            return this;
          },

       });
});
