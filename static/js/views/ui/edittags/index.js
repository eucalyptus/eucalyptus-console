define([
   'underscore',
   'text!./template.html!strip',
   'backbone',
   'models/tag',
   'app'
], function(_, template, Backbone, Tag, app) {
    return Backbone.View.extend({
        template: template,
        TagModel: Tag,

        prepareTag: function(t) {
          if (!/^euca:/.test(t.get('name'))) {
              var nt = new this.TagModel(t.pick('id','name','value','res_id'));
              nt.set({_clean: true, _deleted: false, _edited: false, _edit: false, _new: false});
              if(/^aws:/.test(t.get('name'))) {
                nt.set({_displayonly: true, _clean: false, _immutable: true});
              }
              return nt;
          }
        },

        initialize : function(args) {
            var self = this;

            //this.template = template;
            var model = args.model;
            var tags = new Backbone.Collection();
            var tagDisplay = args.model.tagDisplay ? args.model.tagDisplay : new Backbone.Model();


            var loadTags = function() {
                model.get('tags').each(function(t) {
                  tags.add(self.prepareTag(t));
                });
            }

            loadTags();

            model.on('reload', function() {
              tags.reset();
              loadTags();
              self.render();
            });

            model.on('addTag', function(tag, unique_keys) {
              var name = tag.get('name');
              if(unique_keys) {
                var duplicates = tags.where({name: name});
                tags.remove(duplicates, {silent: true});
              }
              tags.add(self.prepareTag(tag));
              self.render();  
            });

            model.on('confirm', function(defer, options) {
                self.scope.create();

                // save and delete success/error callbacks, to be passed in 
                // by the thing that triggers this event. Set defaults if missing.
                if(!options)
                  var options = {wait: true};

                if(!options.saveoptions)
                  options.saveoptions = {wait: true};
                else
                  options.saveoptions['wait'] = true;

                if(!options.deleteoptions)
                  options.deleteoptions = {wait: true};
                else
                  options.deleteoptions['wait'] = true;

                _.chain(tags.models).clone().each(function(t) {
                   var backup = t.get('_firstbackup');    // _firstbackup: the original tag to begin edit with
                   //console.log('TAG',t);
                   if (t.get('_deleted')) {
                       // If the tag is new and then deleted, do nothing.
                       if (!t.get('_new')) {
                           // If this was edited, we really want to destroy the original
                           if (backup != null) {
                               //console.log('delete', backup);
                               backup.destroy(options.deleteoptions);
                           } else {
                               //console.log('delete', t);
                               t.destroy(options.deleteoptions);
                           }
                       } else {
                         // remove _new _delete tags
                         tags.remove(t);
                       }
                   } else if (t.get('_edited')) {
                       // If the tag is new then it should only be saved, even if it was edited.
                       if (t.get('_new')) {
                         if(!defer){
                           t.save({}, options.saveoptions);
                         }
                       } else if( (backup != null) && (backup.get('name') !== t.get('name')) ){
                         // CASE OF KEY CHANGE
                         //console.log("EDITED TAG TO: " + t.get('name') + ":" + t.get('value'));
                         backup.destroy(options.deleteoptions);
                         if(!defer){
                           t.save({}, options.saveoptions);
                         }
                       }else{
                         // CASE OF VALUE CHANGE
                         if(!defer){
                           t.save({}, options.saveoptions);
                         }
                       } 
                   } else if (t.get('_new')) {
                     if(!defer){
                       t.save({}, options.saveoptions);
                     }
                   }
                });
                //model.get('tags').set(tags.models);
            });

            // ADDED TO ALLOW DIALOGS TO ADD NAME
            model.on('add_tag', function(this_tag) {
              self.scope.tags.add(this_tag);
            });

            // DISABLE THE NEW TAG INPUTBOXES AND ICON
            model.on('editmode', function() {
              self.scope.isEditMode = true;
              self.scope.isDisplayCreateIcon = false;
            });

            // ENDABLE THE NEW TAG INPUTBOXES AND ICON
            model.on('cleanmode', function() {
              self.scope.isEditMode = false;
              self.scope.isDisplayCreateIcon = true;
            });

            this.scope = {
                newtag: new self.TagModel(),
                tags: tags,
                isTagValid: true,
                isEditMode: false,
                isDisplayCreateIcon: true,
                error: new Backbone.Model({}),
                status: '',
                tagDisplay: tagDisplay,

                // Abort other edit-in-progress
                deactivateEdits: function() {
                    self.scope.tags.each(function(t) {
                        if (t.get('_edit')) {
                            t.set(t.get('_backup').pick('name','value'));
                            t.set({_clean: true, _deleted: false, _edit: false});
                        }
        });
                },

                // Disable all buttons while editing a tag
                disableButtons: function() {
                    self.scope.tags.each(function(t) {
                      if( !t.get('_deleted') ){
                        t.set({_clean: false, _displayonly: true});
                      }
                    });
                },

                // Restore the buttons to be clickable
                enableButtons: function() {
                    self.scope.tags.each(function(t) {
                      if( !t.get('_deleted') ){
                       t.set({_clean: t.get('_immutable') ? false : true});
                         t.set('_displayonly', t.get('_immutable') ? true : false);
                      }
                    });    
                },

                // Entering the Tag-Edit mode
                enterTagEditMode: function() {
                    self.scope.deactivateEdits();
                    self.scope.disableButtons();
                    model.trigger('editmode');  
                },

                // Entering the Clean mode
                enterCleanMode: function() {
                    self.scope.enableButtons();
                    model.trigger('cleanmode');  
                },

                create: function() {

                    // NO-OP IF NOT VALID
                    if( !self.scope.isTagValid ){
                      return;
                    }

                    // only allow ten tags
                    if( self.scope.tags.length >= 10 ) {
                      var limit = self.scope.tags.length;
                      // length limit, but have any been deleted?
                      self.scope.tags.each( function(t, idx) {
                        if (t.get('_deleted')) {
                          limit--;
                        }
                      });
                      if (limit >=  10) {
                        self.scope.error.set('name', app.msg('tag_limit_error_name'));
                        self.scope.error.set('value', app.msg('tag_limit_error_value'));
                        return;
                      }
                    }

                    var newt = new self.TagModel(self.scope.newtag.toJSON());
                    newt.set({_clean: true, _deleted: false, _edited: false, _edit: false, _new: true});
                    newt.set('res_id', model.get(model.idAttribute));
                    // why? // if (newt.get('name') && newt.get('value') && newt.get('name') !== '' && newt.get('value') !== '') {
                    if(newt.isValid(true)) {
                        //console.log('create', newt);
                        self.scope.tags.add(newt);
                        self.scope.newtag.clear();
                        self.scope.isTagValid = true;
                        self.scope.error.clear();
                        self.scope.enterCleanMode();
                        self.model.get('tags').trigger('tagCreateClick', newt);
                        self.render();
                    }
                },
                
                edit: function(element, scope) {
                    //console.log('edit');

                    self.scope.enterTagEditMode();
                    
                    // RETREIVE THE ID OF THE TAG
                    var tagID = scope.tag.get('id');
                    //console.log("TAG ID: " + tagID);

                    // STORE THE ORIGINAL KEY-VALUE WHEN FIRST EDITED: _FIRSTBACKUP
                    if( scope.tag.get('_firstbackup') == undefined ){
                      scope.tag.set('_firstbackup', scope.tag.clone());
                    }
                    // KEEP THE PREVIOUS TAG AS _BACKUP 
                    scope.tag.set('_backup', scope.tag.clone());

                    // MARK THE STATE AS _EDIT
                    scope.tag.set({_clean: false, _deleted: false, _edited: false, _edit: true, _displayonly: false});

                    // SET UP VALIDATE ON THIS TAG
                    scope.tag.on('change', function(thisTag) {
                      scope.error.clear();
                      scope.error.set(scope.tag.validate());
                      thisTag.set('tag_is_invalid', !scope.tag.isValid());
                      model.trigger('validation_change', thisTag);
                    });

                    // VERIFY THE VALIDATION STATUS
                    scope.tag.on('validated', function(model) {
                      scope.isTagValid = scope.tag.isValid();
                    });
                    self.model.get('tags').trigger('tagEditClick', scope.tag);
                    self.render();
                },

                confirm: function(element, scope) {
                   
                    // NO-OP IF NOT VALID 
                    if( !scope.tag.isValid() ){
                      return;
                    }

                    if (scope.tag.get('name') != scope.tag.get('_backup').get('name')) {
                        scope.tag.set('id', undefined);
                    } else {
                        scope.tag.set('_backup', undefined);
                    }
                    scope.tag.set({_clean: true, _deleted: false, _edited: true, _edit: false});
                    self.scope.enterCleanMode();
                    self.model.get('tags').trigger('tagConfirmClick', scope.tag);
                    self.render();
                },

                restore: function(element, scope) {
                    if ( scope.tag.get('_backup') != null ) {
                        scope.tag.set( scope.tag.get('_backup').toJSON() );
                    } else {
                        scope.tag.set({_clean: true, _deleted: false, _edit: false});
                    }

                    scope.error.clear();
                    self.scope.enterCleanMode();
                    self.model.get('tags').trigger('tagRestoreClick', scope.tag);
                    self.render();
                },

                delete: function(element, scope) {
                    //console.log('delete');
        // ALWAYS BACKUP BEFORE DELETE
                    scope.tag.set( '_backup', scope.tag.clone() );
                    scope.tag.set({_clean: false, _deleted: true, _edit: false});
                    self.model.get('tags').trigger('tagDeleteClick', scope.tag);
                },

                showDisplayOnlyTags: function(ctx) {
                  if(ctx.tag.get('_immutable') && this.tagDisplay.get('showSystemTags')) {
                    return true;
                  } 
                  if(ctx.tag.get('_immutable') && !this.tagDisplay.get('showSystemTags')) { 
                    return false;
                  }
                  if (ctx.tag.get('_displayonly')) {
                    return true;
                  }
                  return false;
                },
            } // end of scope

            self.scope.tagDisplay.set('showSystemTags', ($.cookie('showSystemTags') === "true"));

            self.scope.tagDisplay.on('change:showSystemTags', function(model) {
               $.cookie('showSystemTags', model.get('showSystemTags'));
               this.render();
            }, this);

            self.scope.newtag.validation.res_id.required = false;

            self.scope.newtag.on('change', function() {
              self.scope.error.clear();
              self.scope.error.set(self.scope.newtag.validate());
              if(!self.scope.newtag.get('name') && !self.scope.newtag.get('value')) {
                self.scope.newtag.unset('tag_is_invalid');
                model.trigger('validation_change', self.scope.newtag);
                ; // ignore - not a real tag *BUG?*
              } else {
                self.scope.newtag.set('tag_is_invalid', !self.scope.newtag.isValid());
                model.trigger('validation_change', self.scope.newtag);
              }
            });

            self.scope.newtag.on('validated', function() {
              self.scope.isTagValid = self.scope.newtag.isValid();
              //console.log("isTagValid: " + self.scope.newtag.isValid());
            });

           self.scope.fireChange = function(e) {
             if(e.keyCode != 9) { 
               $(e.target).change();
             }
           }

            this.$el.html(this.template);
            this.rview = rivets.bind(this.$el, this.scope);
            this.render(this.scope);
        },

        render : function() {
          this.rview.sync();
          return this;
        },

    });
});
