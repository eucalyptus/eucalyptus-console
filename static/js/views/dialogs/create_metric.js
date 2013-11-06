define([
   'backbone',
   'app',
   './eucadialogview',
   'text!./create_metric.html!strip',
], function(Backbone, app, EucaDialogView, template) {
    return EucaDialogView.extend({
        initialize : function(args) {
            var self = this;
            this.template = template;
            var metric = args.model.metric;

            var scope = {
                help: {title: null, content: help_enter_custom_metric.dialog_content, url: help_enter_custom_metric.dialog_content_url, pop_height: 600},
                metric: metric,
                error: new Backbone.Model(),
                status: '',
                units: new Backbone.Collection([
                    {id: 'Seconds'},
                    {id: 'Microseconds'},
                    {id: 'Milliseconds'},
                    {id: 'Bytes'},
                    {id: 'Kilobytes'},
                    {id: 'Megabytes'},
                    {id: 'Gigabytes'},
                    {id: 'Terabytes'},
                    {id: 'Bits'},
                    {id: 'Kilobits'},
                    {id: 'Megabits'},
                    {id: 'Gigabits'},
                    {id: 'Terabits'},
                    {id: 'Percent'},
                    {id: 'Count'},
                    {id: 'Bytes/Second'},
                    {id: 'Kilobytes/Second'},
                    {id: 'Megabytes/Second'},
                    {id: 'Gigabytes/Second'},
                    {id: 'Terabytes/Second'},
                    {id: 'Bits/Second'},
                    {id: 'Kilobits/Second'},
                    {id: 'Megabits/Second'},
                    {id: 'Gigabits/Second'},
                    {id: 'Terabits/Second'},
                    {id: 'Count/Second'},
                    {id: 'None'}
                ]),

                cancelButton: new Backbone.Model({
                    id: 'button-dialog-createmetric-cancel',
                    click: function() {
                       self.close();
                    }
                }),

                submitButton: new Backbone.Model({
                  id: 'button-dialog-createmetric-save',
                  click: function() {
                      metric.trigger('submit');
                      self.close();
                  }
                })
            }
            this.scope = scope;

            this._do_init();
        },
	});
});
