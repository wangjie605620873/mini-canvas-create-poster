# ios-slide-del-mini
小程序放IOS删除滑块
# 小程序 滑动删除  仿IOS滑动删除


### 需求，优化钱
> 1.项目需要滑动删除的功能，项目最初时间有点赶，基于最简单的思路去写的。最后发现体验并不好，有卡顿现象，而且当页面出现滚动条时，页面上下滑动时也会出现卡顿现象，所有抽时间重写。
> 2.之前的实现方式是通过 滑动动态去setData然后绑定dom设置dom的style,也比较消耗性能,实现起来比重写后的要复杂。


### 优化前实现方案

```html
<view style={{position}}></view>
```

```javascript

.........
this.setData({
   position : "left:28.123762"//小数点....会导致更卡 
})
.........

```

### 优化后实现方案
> 1.`touchStart`
> 2.`touchEed`
> 3.`wx.createAnimation`
> 通过`touchStart，touchEed`来判断用户手指的移动方向和移动距离，添加不同的动画
> 4.`{{ index == activeIndex ? animation : animationClose }}`,添加打开动画，关闭动画。activeIndex不是当前选中滑动的元素，肯定是要关闭的动画取反即可

### 代码

```html

<view>
  <view class="list" wx:for="{{list}}" wx:key="{{id}}" >
    <view class="slide-box" data-index="{{index}}"
       bindtouchstart="touchS"
        bindtouchend="touchE"
          animation="{{ index == activeIndex ? animation : animationClose }}" 
          >
      <view class="pot-image">
        <image src="{{item.image}}"></image>
      </view>
      <view>
        {{item.title}}{{index}}
      </view>
    </view>
    <view class="del">删除</view>
  </view>
</view>

```
```javascript
Page({
    data : {
        animationStart: "",//打开动画
        activeIndex: '',  //当前选中的元素
        startClient: '',  //起点位置
        animationClose : "",//关闭动画
    },
      onLoad: function () {
    this.animationStart = wx.createAnimation({
      duration: 450,
      timingFunction: 'ease',
      delay: 0,
      transformOrigin: 'left top 0',
      success: function (res) {
        this.setData({
          startClient: ''
        })
      }
    })
    this.animationClose = wx.createAnimation({
      duration: 450,
      timingFunction: 'ease',
      delay: 0,
      transformOrigin: 'left top 0',
      success: function (res) {}
    })
  },
  
  
  //滑动开始
  touchS: function (e) {  
    console.log(e,'start')
      //设置当前滑动  元素的 index
      //滑动元素的  起始x  位置
    this.setData({
      activeIndex: e.currentTarget.dataset.index, 
      startClient: e.changedTouches[0].clientX,   
      animationStart: ""
    })
  },
  
  
  //滑动结束
  touchE: function (e) { 
    console.log(e,'end')
    //计算当前移动的距离
    var clientX = e.changedTouches[0].clientX  
    //起始点 - 结束点   关闭
    if (clientX - this.data.startClient > 60) {    
      this.animationStart.left(0).step()
      //打开
    } else if (clientX - this.data.startClient  < -60) {  
      this.animationStart.left(-180).step()   
      //关闭上一个
      this.animationClose.left(0).step()
    }
    this.setData({
      animationStart: this.animationStart.export(),
      animationClose: this.animationClose.export()
    })
  }
})
```

