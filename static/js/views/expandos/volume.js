define([
  'app',
  'underscore',
  './eucaexpandoview',
  'text!./volume.html!strip',
], function(app, _, EucaExpandoView, template) {
  return EucaExpandoView.extend({
    initialize : function(args) {
      var self = this;
      this.template = template;
      var tmp = this.model ? this.model : new Backbone.Model();
      this.model = new Backbone.Model();
      this.model.set('volume', tmp);
      this.model.set('snapshot', app.data.snapshots.get(tmp.get('snapshot_id')));
      var instance_id = tmp.get('attach_data').instance_id;
      if (instance_id != undefined) {
        this.model.set('instance_name', app.data.instances.get(instance_id).get('display_id'));
      }
      this.scope = this.model;
      if(this.model.get('volume').get('tags').length > 0 ){
        this.scope.set('showTagHeader', true);
      }else{
        this.scope.set('showTagHeader', false);
      }
      this._do_init();

      var tmptags = this.model.get('volume').get('tags');
      tmptags.on('add remove reset sort sync', function() {
        if(self.model.get('volume').get('tags').length > 0 ){
          self.scope.set('showTagHeader', true);
        }else{
          self.scope.set('showTagHeader', false);
        }
        self.render();
      });
},
    remove : function() {
      this.model.destroy();
    }
  });
});
