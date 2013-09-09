define([
   'underscore',
   'text!./template.html!strip',
   'backbone',
   'models/astag',
   'app',
   '../edittags/index'
], function(_, template, Backbone, Tag, app, EditTag) {
    
    return EditTag.extend({
      TagModel: Tag,
      template: template,
      prepareTag: function(t) {
        if (!/^euca:/.test(t.get('name'))) {
            var nt = new this.TagModel(t.pick('id','name','value','res_id', 'propagate_at_launch'));
            nt.set({_clean: true, _deleted: false, _edited: false, _edit: false, _new: false});
            if(/^aws:/.test(t.get('name'))) {
              nt.set({_displayonly: true, _clean: false, _immutable: true});
            }
            return nt;
        }
      },
    });
});
