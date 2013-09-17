define([
    'models/images',
    'models/allimage'
], function(images, allimage) {
    var Allimages = images.extend({
      model: allimage,
      url: '/ec2?Action=DescribeAllImages',
    });
    return Allimages;
});
