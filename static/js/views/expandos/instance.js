define([
  'app',
  'underscore',
  'backbone',
  './eucaexpandoview',
  'text!./instance.html!strip',
], function(app, _, Backbone, EucaExpandoView, template) {
  return EucaExpandoView.extend({
    initialize : function(args) {
      var self =  this;
      this.template = template;
      var tmp = this.model ? this.model : new Backbone.Model();
      var id = tmp.get('id');
      this.model = new Backbone.Model();
      this.model.set('instance', tmp);
      var state = tmp.get('state');
      if (state == undefined) {
        state = tmp.get('_state').name;
      }
      this.model.set('status', state);
      var placement = tmp.get('placement');
      if (placement == undefined) {
        placement = tmp.get('_placement').zone;
      }
      this.model.set('zone', placement);
      this.model.set('test', new Backbone.Collection([{foo: 'bar'}, {foo: 'blah'}]));
      this.model.set('volumes', app.data.volumes.reduce(function(c, v) {
                        return v.get('attach_data').instance_id == id ? c.add(v) : c;
                      }, new Backbone.Collection()));
      this.model.set('image', app.data.allimages.get(this.model.get('instance').get('image_id')));
      this.model.set('scaling', app.data.scalinginsts.get(id));
      this.model.set('instHealth', app.data.insthealths.get(id));
      var platform = this.model.get('image') !== undefined ? this.model.get('image').get('platform') : '';
      if (platform === undefined || platform == '') {
        platform = 'linux';
      }
      this.model.set('platform', platform);
      this.scope = this.model;//_.extend(this.model, {});
      this._do_init();

      // refresh when tags change
      var tmptags = this.model.get('instance').get('tags');
      tmptags.on('add remove reset sort sync', function() {
        self.render();
      });
    },
    remove : function() {
      this.model.destroy();
    }
  });
});
