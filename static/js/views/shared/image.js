define([
    'underscore',
    'backbone',
    'app',
  'text!./image.html!strip',
  'rivets',
  'views/searches/image',
  './model/blockmap',
  'visualsearch'
	], function( _, Backbone, app, template, rivets, imageSearch, BlockMap, VS ) {
	return Backbone.View.extend({
            title: app.msg('launch_instance_section_header_image'),
            next: app.msg('launch_instance_btn_next_type'),
            count: 0,
            image_selected: null,

            initialize : function(args) {
              var self = this;
              var imgSource = app.data.allimages;
              if (app.aws.aws_account) {
                imgSource = app.data.amazonimages;
              }
              // create this collection so that we can set up event listeners on images to fill it.
              var search_collection = new Backbone.Collection(imgSource.where({type: 'machine', state: 'available'}));
              // populate the search_collection if we get new images data
              self.listenTo(imgSource, 'add remove sync change reset', function() {
                search_collection.set(imgSource.where({type: 'machine', state: 'available'}));
              });


              var scope = {
                view: this,
                blockmaps: self.options.blockMaps,
                showLoader: function() {
                  if(self.scope.images.length > 0 || search_collection.length > 0) {
                    return false;
                  }
                  return true;
                },



                formatName: function(image){
                  return DefaultEncoder().encodeForHTML(this.image.get('name'));
                },
 
                formatDescription: function(image){
                  return DefaultEncoder().encodeForHTML(this.image.get('description'));
                },

                isOdd: function() {
                    var selected = this.isSelected(arguments);
                    return ((this.view.count++ % 2) ? 'even' : 'odd') + selected;
                },

                isSelected: function(image) {
                  var image = this.image;
                  if (self.model.get('id') == image.get('id')) {
                      return ' selected-row';
                  } 
                  return '';
                },

                setClass: function(image) {
                    var image = this.image;
                    return inferImage(image.get('location'), image.get('description'), image.get('platform'));
                },

                search: new imageSearch(search_collection),
                
                select: function(e, images) {
                  $(e.currentTarget).parent().find('tr').removeClass('selected-row');
                  $(e.currentTarget).addClass('selected-row');
                  self.model.set('image_iconclass', this.setClass(images.image));
                  self.model.set('id', images.image.get('id'));
                  //images.image.unset('tags'); // workaround - nested objects break the next line
                  self.model.set(images.image.toJSON());
                  self.model.set('platform', this.setClass(self.model));

                  //block device maps
                  var maps = images.image.get('block_device_mapping');
                  var keys = _.keys(maps);
                  for(i=0; i<keys.length; i++) {
                    var key = keys[i];
                    var map = {
                      device_name: key,
                      volume_size: maps[key].size
                    };
                    
                    var subkeys = _.keys(maps[key]);
                    for(j=0; j<subkeys.length; j++) {
                      map[subkeys[j]] = maps[key][subkeys[j]];
                    }
                  }
                  if(map !== undefined) {
                    self.options.blockMaps.reset(new BlockMap(map));
                  } else {
                    self.options.blockMaps.reset();
                  }
                },

                
                launchConfigErrors: {
                  image_id: ''    
                }
          };
          this.scope = scope;

          this.$vel = $('<div></div>');
          this.vsearch = VS.init({
              container : this.$vel,
              showFacets : true,
              query     : this.scope.search.defaultSearch,
              callbacks : {
                  search       : this.scope.search.search,
                  facetMatches : this.scope.search.facetMatches,
                  valueMatches : this.scope.search.valueMatches
              }
          });

          _.each(this.scope.search.deriveFacets(), function(pair) {
            self.vsearch.categoryLabels[pair.value] = pair.label;
          });

          this.vsearch.searchBox.setQuery(this.scope.search.defaultSearch);

          this.listenTo(this.scope.search.records, 'deprecated', function(newrecords) {
            this.stopListening(this.scope.search.records);
            this.listenTo(newrecords, 'add remove change reset sync', function() {
              self.vsearch.searchBox.searchEvent($.Event('keydown'));
            });
          });

          this.listenTo(this.scope.search.records, 'add remove change reset sync', function() {
            self.vsearch.searchBox.searchEvent($.Event('keydown'));
          });


          self.model.on('validated:invalid', function(model, errors) {
              scope.launchConfigErrors.image_id = errors.id; 
              self.render(); 
          });

          self.model.on('validated:valid', function()  {
            scope.launchConfigErrors.image_id = null;
            self.render();
          });

          scope.images = scope.search.filtered;
          scope.search.filtered.on('add remove sync change reset', function() {
              self.render();
          });

          $(this.el).html(template);
          $(this.el).find('#wizard-image-search').replaceWith(this.$vel);
          this.rView = rivets.bind(this.$el, this.scope);
          this.render();

          if(this.model.get('image') != undefined) {
             this.$el.find('span:contains("' + this.model.get('image') + '")').closest('tr').click();
          }

          self.vsearch.searchBox.searchEvent($.Event('keydown'));
        },

        render: function() {
          this.rView.sync();
        },
    
        isValid: function() {
          this.model.validate(_.pick(this.model.toJSON(),'id'));
          var error = this.model.isValid();

          return error;
        },
  });
});
