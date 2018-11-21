# 小程序生成海报，并保存到手机相册

[github地址](https://github.com/wangjie605620873/mini-canvas-create-poster)
[blog地址](http://www.superwang.cn/index.php/archives/6/)

### 需求
> 小程序要生成一个海报并保存到手机相册,海报有个二维码，有文字描述等。用户识别二维码进入小程序，二维码内有参数，也就是说这个二维码是动态的，需要服务端生成返回给小程序端。

### 需求分析

> 1.一张背景图片
> 2.一张二维码
> 3.请求接口，并下载2张图片
> 4.将2张图片绘制到canvas
> 5.绘制文字
> 6.保存到手机相册

### 技术点

> 1.`wx.getImageInfo` 下载网络图片，并生成临时路劲
> 2.`promise all`  将2张网络图片都下载完成后在进行`canvas`绘制
> 3.`canvas.drawImage`绘制`canvas`图片
> 4.`wx.canvasToTempFilePath` 将`canvas` 生成图片 生成临时路径
> 5.`saveImageToPhotosAlbum`将生成的临时路径保存到手机相册

### 代码
##### html

```html
<button bindtap='create'>生成</button>
<canvas
  canvas-id="canvas"
  class="canvas"
  style="position:absolute;width:{{canvasWidth}};height:{{canvasHeight}};left:{{canvasLeft}};">
</canvas>
```

##### js

```javascript
const ctx = wx.createCanvasContext('shareCanvas')
Page({
  data: {
    canvasWidth : "",
    canvasHeight : "",
    canvasLeft : "",
    canvasTop : ""
  },
  /*
  获取图片，一般我们生成海报，海报上的二维码都是动态生成的，每次生成的二维码都不一样，且都是通过后台返回的图片地址。
  包括海报背景也是动态，后台返回会来的。所以我们现下载图片，生成临时路径。
  使用promise主要是海报可能有多个图片组成，必须等图片全部下载完成再去生成
  */
  getImage: function (url) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: url,
        success: function (res) {
          resolve(res)
        },
        fail: function () {
          reject("")
        }
      })
    })
  },
  getImageAll: function (image_src) {
    let that = this;
    var all = [];
    image_src.map(function (item) {
      all.push(that.getImage(item))
    })
    return Promise.all(all)
  },
  //创建
  create: function () {
    let that = this;
    //图片一把是通过接口请求后台，返回俩点地址，或者网络图片
    let bg = 'http://statics.logohhh.com/forum/201610/24/170644l325qooyabhioyaa.jpg';
    let qr = 'http://image.weiued.com/UploadImages/question/20170420/3e384842-6af7-44cb-aeb1-f427731c8271.jpg';
    //图片区别下载完成，生成临时路径后，在尽心绘制
    this.getImageAll([bg, qr]).then((res) => {
      let bg = res[0];
      let qr = res[1];
      //设置canvas width height position-left,  为图片宽高
      this.setData({
        canvasWidth : bg.width+'px',
        canvasHeight : bg.height+ 'px',
        canvasLeft : `-${bg.width + 100}px`,
      })
      let ctx = wx.createCanvasContext('canvas');
      ctx.drawImage(bg.path, 0, 0, bg.width, bg.height);
      ctx.drawImage(qr.path, bg.width - qr.width - 100, bg.height - qr.height - 150, qr.width * 0.8, qr.height * 0.8)
      ctx.setFontSize(20)
      ctx.setFillStyle('red')
      ctx.fillText('Hello world', bg.width - qr.width - 50, bg.height - qr.height - 190)
      ctx.draw()
      wx.showModal({
        title: '提示',
        content: '图片绘制完成',
        showCancel:false,
        confirmText : "点击保存",
        success : function () {
          that.save()
        }
      })
    })
  },
  //保存
  save : function () {
    wx.canvasToTempFilePath({//canvas 生成图片 生成临时路径
      canvasId: 'canvas',
      success : function (res) {
        console.log(res)
        wx.saveImageToPhotosAlbum({ //下载图片
          filePath : res.tempFilePath,
          success : function () {
            wx.showToast({
              title : "保存成功",
              icon: "success",
            })
          }
        })
      }
    })
  }
})
```
