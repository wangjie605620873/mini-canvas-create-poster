Page({
  data: {},
  onShow: function () {

  },
  /*
  获取图片，一般我们生成海报，海报上的二维码都是动态生成的，每次生成的二维码都不一样，且都是通过后台返回的图片地址。
  包括海报背景也是动态，后台返回会来的。所以我们现下载图片，生成临时路径。
  使用promise主要是海报可能有多个图片组成，必须等图片全部下载完成再去生成
  */
  getImage: function (url) {
    return new Promise(function (res, rej) {
      wx.getImageInfo({
        src: url,
        success: function (res) {
          res(res)
        },
        fail: function () {
          rej("")
        }
      })
    })
  },
  getImageAll: function (image_src) {
    let that = this;
    var all = [];
    image_src.map(function (item) {
      all.push()
    })
    return Promise.all([that.getImage(bg_img), that.getImage(qr_img)])
  },
  create: function () {

  }


})