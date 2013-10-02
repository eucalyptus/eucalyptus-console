define([
    'models/eucacollection',
    'models/allimage'
], function(EucaCollection, allimage) {
    var Allimages = EucaCollection.extend({
      model: allimage,
      url: '/ec2?Action=DescribeAllImages',
    });
    return Allimages;
});
