define([
  'views/searches/generic',
  'views/searches/tagsearch',
  'app'
], function(Search, TagSearch, app) {
  return function(images) {

    var USER_ID = "";
    app.data.sgroup.each(function(securityGroup) {
      securityGroup = securityGroup.toJSON();
      if ('default' === securityGroup.name) {
        USER_ID = securityGroup.owner_id;
      }
    });
    var config = {
      field: 'image',
      facets: ['all_text', 'architecture', 'description', 'name',
        'ownerId', 'platform', 'root_device_type'],

      localize: {
        ownerId: app.msg('search_facet_image_owner'), //'Owner',
        i386 : app.msg('search_facet_image_i386'), //'32-bit',
        x86_64 : app.msg('search_facet_image_x86_64'), //'64-bit',
        root_device_type : app.msg('search_facet_image_root_device'), //'Root Device',
        ebs : app.msg('search_facet_image_ebs'), //'EBS',
        platform: app.msg('search_facet_image_platform'), //'Platform'
        architecture: app.msg('search_facet_image_arch'), //'Architecture'
        description: app.msg('search_facet_image_desc'), //'Description'
        name: app.msg('search_facet_image_name'),
        all_text: app.msg('search_facet_alltext')
      },

      match: {
        ownerId: function(search, item, add) {
          add('me');
          if (app.aws && app.aws.aws_account) {
            add('amazon');
          }
        }
      },

      custom_source: function(search, facets) {
        if (facets && facets.find && facets.find('ownerId') == 'me') {
          console.log("IMAGE SEARCH : using app.data.images");
          return app.data.images;
        }
        else if (facets && facets.find && facets.find('ownerId') == 'amazon') {
          console.log("IMAGE SEARCH : using app.data.amazonimages");
          if (app.data.amazonimages.length == 0) {
            app.data.amazonimages.fetch();
          }
          return app.data.amazonimages;
        }
        else {
          console.log("IMAGE SEARCH : using app.data.allimages");
          //app.data.allimages.add(app.data.images);
          if (app.data.allimages.length == 0) {
            app.data.allimages.fetch();
          }
          return app.data.allimages;
        }
      },

      search: {
        ownerId: function(search, facetSearch, item, itemsFacetValue, hit) {
          var test = facetSearch === 'me' ? USER_ID : facetSearch;
          if (item.get('owner_alias') === test || item.get('owner_id') === test) {
            hit();
          }
        }
      }
    };

    if (app.aws && app.aws.aws_account) {
        config.defaultSearch = 'ownerId: amazon';        
    }

    var searchConfig = new Search(images, new TagSearch(config, images));
    return searchConfig;
  }
});
