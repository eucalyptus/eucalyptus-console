define([
    'underscore',
    'backbone',
    'app',
  'text!./image.html!strip',
  'text!./image-infiniteitem.html!strip',
  'rivets',
  'views/searches/image',
  './model/blockmap',
  'infinity',
  'visualsearch'
	], function( _, Backbone, app, template, itemTemplate, rivets, imageSearch, BlockMap, infinity, VS ) {
	return Backbone.View.extend({
            title: app.msg('launch_instance_section_header_image'),
            next: app.msg('launch_instance_btn_next_type'),
            count: 0,
            image_selected: null,

            initialize : function(args) {
              infinity.config.PAGE_TO_SCREEN_RATIO = 5;
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
              var scope = this.scope = {

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
                    return inferImage(image.get('location'), image.get('description'), image.get('platform'));
                },

                search: new imageSearch(search_collection),
                
                launchConfigErrors: {
                  image_id: ''    
                }
          };

          scope.images = scope.search.filtered;
               
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

         $(this.el).html(template)
          $(this.el).find('#wizard-image-search').replaceWith(this.$vel);
         this.rView = rivets.bind(this.$el, this.scope);

          var $itmpl = $('#launch-images', self.el).clone();

          $('#launch-images', self.el).remove();
          var updateInfinity = _.debounce(function() {
              console.log('begin infinity init');

              if (self.infinity != undefined) { 
                  console.log('removed old el', self.el);
                  $('#launch-images', self.el).remove();
                  self.infinity.remove(); 
                  self.infinit = undefined;
              }
              
              var $newtmpl = $itmpl.clone(); 
              $('#table-wrapper', self.el).prepend($newtmpl);

              self.infinity = new infinity.ListView($newtmpl, {useElementScroll: true});
              var count = 0;

              var isSelected = function(context) {
                  var image = context.get('image');
                  if (self.model.get('id') == image.get('id')) {
                      return ' selected-row';
                  } 
                  return '';
              }

              var setClass = function(context) {
                    var image = context.get('image');
                    return inferImage(image.get('location'), image.get('description'), image.get('platform'));
              }

              var added = 0;
              var totalAdded = 0;
              var doWork = function() {
                  // console.log('start work');
                  var start = new Date().getTime();

                  while (count < scope.search.filtered.length && (new Date().getTime() - start < 500)) {
                      var image = scope.search.filtered.at(count);
                      var $tmpl = $(itemTemplate);
                      rivets.bind($tmpl, new Backbone.Model({
                            image:image,
                            formatName: DefaultEncoder().encodeForHTML(image.get('name')),
             
                            formatDescription: DefaultEncoder().encodeForHTML(image.get('description')),

                            isOdd: (count % 2) ? 'even' : 'odd',

                            isSelected: isSelected,

                            setClass: setClass,

                        select: function(e, images) {
                          var image = images.get('image');
                          $(e.currentTarget).parent().find('div').removeClass('selected-row');
                          $(e.currentTarget).addClass('selected-row');
                          self.model.set('image_iconclass', scope.setClass(image));
                          self.model.set('id', image.get('id'));
                          self.model.set(image.attributes);
                          self.model.set('platform', scope.setClass(image));

                          //block device maps
                          var maps = image.get('block_device_mapping');
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

         
                      }));
                      self.infinity.append($tmpl);
                      count++;
                      added++;
                  }

                  // console.log('count: ' + count);

                  if (count < scope.search.filtered.length && added < 100) { 
                      _.defer(doWork);
                  } else {
                      // console.log('end infinity init:', added);
                      totalAdded += added;
                      added = 0;
                  }
              }
              doWork();

              var $scrollbox = $($newtmpl.children().get(0));
              $newtmpl.on('scroll', _.debounce(function() {
                  // console.log('SCROLL!', $scrollbox.height(), $newtmpl.scrollTop());
                  if (added < scope.search.filtered.length && 
                      $scrollbox.height() == $newtmpl.scrollTop() + $newtmpl.height()) {
                      doWork();
                  }
              }));

          }, 500);

          self.render();

          var listener = new Backbone.Model({});
          listener.listenTo(scope.search.filtered, 'add remove sync change reset', updateInfinity);

          updateInfinity();

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
