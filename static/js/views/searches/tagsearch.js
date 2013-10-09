define([], function() {
  return function(config, data) {
    var self = this;

    function getTags() {
      return data.reduce(function(tags, m) { 
          var m_tags = m.get('tags');
          if (m_tags === undefined) return;
          return tags.add(m_tags.models, {silent:true});
      }, new Backbone.Collection()).groupBy(function(t) { 
          return t.get('name'); 
      });
    }

    self.facetsCustomizer = function(add, append) {
      if (config.facetsCustomizer) {
        config.facetsCustomizer.apply(this, add, append);
      }
      var tags = getTags();
      var hasTags = 0;
      for (var tagName in tags) {
        hasTags++;
        if (hasTags) break;
      }
      for (var tagName in tags) {
        append(tagName + ' _tag', tagName, 'Tags');
      }
    };

    self.search = {};
    if (config.search) {
      for (var key in config.search) {
        self.search[key] = config.search[key];
      }
    }

    function searchMatch(search, item) {
      var rex = new RegExp('.*' + search + '.*', 'img');
      // Replaced this code with simpler test below. Only concern is that
      // somehow matching functionaliy is reduced, but seems like tags just
      // want to match values, hence the simplification. - dak
      /*for (var key in item) {
        var obj = item[key];
        if (typeof obj !== 'function') {
          if (rex.test(obj + '')) {
            return true;
          }
        }
      }*/
      if (rex.test(item.get('value'))) {
        return true;
      }
      return false;
    }

    self.__defineGetter__ && self.__defineGetter__("search", function() {
      var result = {};
      if (config.search) {
        for (var key in config.search) {
          result[key] = config.search[key];
        }
      }
      if (self.tags === undefined) {
        self.tags = getTags();
      }
      tags = self.tags;
      
      for (var tagName in tags) {
        var searchName = tagName + ' _tag';
        result[searchName] = function(search, facetSearch, item, itemsFacetValue, hit) {

          // FIXME Whoa, WTF - the search parameter is a *string* like
          // '"Name (tag)" : "foo"'
          //var extractSearchText = /.*"(.*?) _tag":\s?"(.+)"/
          // JP - 20130532 - EUCA-6378 - catch tag values with double quotes in them, as part of the name.
          var extractSearchText = /['"](.*?) _tag['"]:\s?['"](.+)['"]/
          //console.log('TEST', search, extractSearchText.test(search));
          //console.log('EXEC', search, extractSearchText.exec(search));
          if (extractSearchText.test(search)) {
            var sreg = extractSearchText.exec(search);
            var tagStr = sreg[1];
            var actualSearchTerm = sreg[2];

            var currSet = tags[tagStr];
            if (currSet != undefined) {
              for (var i = 0; i < currSet.length; i++) {
                var oneItem = currSet[i];
                var theTags = item.get('tags');
                theTags.each(function(oneTag) {
                  if (oneItem.get('id') === oneTag.get('id')) {
                    if (searchMatch(actualSearchTerm, oneTag)) {
                      hit();
                    }
                  }
                });
              }
            }

          }
          return true;
        };
      }
      return result;
    });

    for (var key in config) {
      if (!self[key]) {
        self[key] = config[key];
      }
    }
  };

});
