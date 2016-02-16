(function() {
	var D = document,
	cvs = D.getElementById('J_Sign'),
	tip = D.getElementById('J_Tip'),
	ctx = null;

	if (!cvs.getContext || typeof FileReader == 'undefined') {
		tip.innerHTML = '此款浏览器不被支持，请使用<strong><a href="http://firefox.com.cn/" target="_blank" rel="external">火狐浏览器</a></strong>或<strong><a href="http://www.google.com/chrome/?hl=zh-TW" target="_blank" rel="external">谷歌浏览器</a></strong>浏览本页面！';
		tip.className = 'showTip';
		return false;
	} else {
		ctx = cvs.getContext('2d');
	}

	var bgImg = new Image(),
	imgBase64 = null,
	get = function(s) {
		return D.querySelector(s)
	},
	getAll = function(s) {
		return D.querySelectorAll(s)
	},
	avatar = get('#J_Avatar'),
	nameInputs = getAll('#nameInfo input'),
	extraInputs = getAll('#extraInfo input'),
	inputs = getAll('.info input'),
	savBtn = get('#J_Save'),
	resetBtn = get('#J_Reset'),
	helpBtns = getAll('.avatar .j_goHelp'),
	fileUp = get('input[type="file"]'),
	avatarUrl = 'avatar.png',
	file = null,
	avatarPic = null,
	video = get('video'),
	$IMG = 'img',
	$T = 't',
	$R = 'r',
	$W = 'w',
	$H = 'h',
	$TOP = 'top',
	$LEFT = 'left';

	/**
	 * Normal upload
	 **/
	fileUp.onchange = function() {
		if (this.files && (file = this.files[0])) {
			afterFileUpload(file);
		}
	}

	/**
	  * Video Control
	  * chrome:must use addEventListener method to add video event 
	 **/
	video.caption = {
		data: {
			'0': 'hello!欢迎使用邮件签名生成器^_^ ',
			'2': '现在开始演示……',
			'4': '上载头像图片可以有多种方式……',
			'7': '从文件系统直接拖动图片到头像虚线框……',
			'10': '上载的图片拖动可以调整位置……',
			'14': 'ESC键重置图片位置……',
			'16': 'Del键删除已上载的图片……',
			'20': '还可以用普通方式上载图片……，只需轻轻一点……',
			'28': '或者从旺旺中上载图片……只需拖动……',
			'39': '从其他窗体上载图片……比如网页上的图片……',
			'45': '截取头像也很简单……',
			'47': '开始……',
			'52': 'SHIFT+方向键快速移动图片……',
			'56': '方向键微调……加键放大……减键缩小……',
			'62': '预览区有即时效果……',
			'65': '开始输入职位信息……',
			'71': '有问题可以重置，再来一次……',
			'80': '认真填写ing……',
			'102': '全部OK了……再检查一遍……',
			'108': '生成图片……',
			'110': '右键图片选择复制或另存为图片……',
			'115': '保存图片……',
			'130': '验证无误……',
			'145': '渔隐出品，必属精品……',
			'148': '谢谢！'
		},
		set: function(text) {
			if (text) this.tipArea.innerHTML = text;
		},
		init: function() {
			var pNode = document.createElement('p');
			var spanNode = document.createElement('span');
			pNode.className = 'videoTips';
			pNode.innerHTML = 'Tips: ';
			video.parentNode.appendChild(pNode);
			pNode.appendChild(spanNode);
			this.tipArea = spanNode;
			pNode = null;
			spanNode = null;

			addEvent(video, 'timeupdate',
			function() {
				this.caption.set(this.caption.data[Math.floor(this.currentTime)]);
			});
		}
	};

	addEvent(video, 'play',
	function() {
		video.caption.init();
	});

	video.shaking = false;

	for (var j = 0; j < helpBtns.length; j++) {
		addEvent(helpBtns[j], 'click',
		function(e) {
			e.preventDefault();
			if (!video.shaking) videoShake();
			return false;
		});
	}

	function videoShake() {
		var w = video.clientWidth,
		h = video.clientHeight - 10,
		//padding
		times = 6,
		rate = 1; (function() {
			if (times > 0) {
				video.shaking = true;
				rate = video.clientWidth == w ? 1.1 : 1;
				video.style.width = w * rate + 'px';
				video.style.height = h * rate + 'px';
				video.style.marginLeft = -w * (rate - 1) / 2 + 'px';
				times--;
				setTimeout(arguments.callee, 80);
			} else {
				video.shaking = false;
			}
		})();
	}

	/**
	 * Preview init
	 **/
	addEvent(bgImg, 'load', function() {
		ctx.drawImage(this, 0, 0);
		saveInit();
		resetInit();
		textUpdate();
	});
	bgImg.src = 'sign-bg.png';

	/**
	 * Avatar init
	 **/
	avatar.style.background = 'url(' + avatarUrl + ') 0 0';
	//avatar.draggable = true;
	addEvent(avatar, 'dragover', cancel);
	addEvent(avatar, 'dragend', cancel);

	addEvent(avatar, 'drop', function(e) {
		e.preventDefault();
		afterFileUpload(e.dataTransfer.files[0]);
		return false;
	});

	/**
	 * single instance
	 **/
	avatarPic = function() {
		var _map = {},
		_self = null;

		/**
		 * attrs change make canvas redraw
		 * img obj must be set every upload time
		 **/
		_map[$IMG] = null; //avatar img

		/**
		 * common attrs
		 **/
		_map[$TOP] = 0; //avatar img top
		_map[$LEFT] = 0; //avatar img left
		_map[$W] = 0; //img width
		_map[$H] = 0; //img height
		_map[$T] = 0; //step times
		_map[$R] = 1; //scale rate

		/**
		 * common apis
		 **/
		return {
			getValue: function(key) {
				return _map[key];
			},
			setValue: function(key, v) {
				if (key == $T) {
					if (v > 100) v = 100;
					if (v < -99) v = -99;
				} else if (key == $TOP || key == $LEFT) {
					var _img = this.getValue($IMG),
					edge = null,
					dis = 0;
					edge = key == $TOP ? 'clientHeight': 'clientWidth';
					dis = 70 - _img[edge];
					//limit edge
					v = v > 0 ? 0 : v < dis ? dis: v;
					_img['style'][key] = v + 'px';
				}

				_map[key] = v;
				this.onValueChange(key);
				if (_img) _img = null;
				if (edge) edge = null;
			},
			onValueChange: function(key) {
				_self = this;

				if (key == $T || key == $R) {
					switch (key) {
					case $T:
						_map[$R] = (1 + _map[$T] / 100 + '').substring(0, 4);
						break;
					case $R:
						_map[$T] = (_map[$R] - 1) * 100;
						break;
					}
					this.setWidth();
				} else {
					var _img = this.getValue($IMG),
					imgXStart = 0,
					imgYStart = 0,
					imgXEnd = 0,
					imgYEnd = 0,
					_time = 0;

					_img.draggable = true;
					_img.style.cursor = 'move';

					/**
					 * avatar img changed 
					 * rebind events
					 **/
					addEvent(_img, 'load',
					function() {

						if (!_img.reset) avatar.appendChild(_img);
						//ctx.globalCompositeOperation = 'destination-over';
						/**
						 * init
						 **/
						_self.setValue($W, _img.width);
						_self.setValue($H, _img.height);
						_self.setValue($R, 1);

						/**
						 * better than while
						 **/
						(function() {
							if (Math.max(_img.width, _img.height) < 70) {
								_self.setValue($T, _self.getValue($T) + 1);
								setTimeout(arguments.callee, 0);
							}
						})()
					});
					_img.isDragging = false; //bugfix for too many events fires
					addEvent(_img, 'dragstart',
					function(e) {
						if (!this.isDragging) {
							imgXStart = e.clientX;
							imgYStart = e.clientY;
							this.isDragging = true;
						}
					});
					addEvent(_img, 'dragover',
					function(e) {
						imgXEnd = e.clientX;
						imgYEnd = e.clientY;
					});
					addEvent(_img, 'dragend',
					function(e) {
						if (this.isDragging) {
							_self.setValue($LEFT, _img.offsetLeft + imgXEnd - imgXStart);
							_self.setValue($TOP, _img.offsetTop + imgYEnd - imgYStart);
							this.isDragging = false;
						}
					});
				}

				/**
				 * every change makes canvas drawing
				 * overwrite mode
				 * no need clearRect
				 **/
				//ctx.clearRect(294,53,70,70);
				try {
					drawScaleImg(this.getValue($IMG));
				} catch(e) {}
			},
			setWidth: function() {
				this.getValue($IMG).width = this.getValue($W) * this.getValue($R);
			},
			resetImg: function() {
				this.getValue($IMG).style.left = 0;
				this.getValue($IMG).style.top = 0;
				this.setValue($R, 1);
			},
			deleteImg: function() {
				avatar.removeChild(this.getValue($IMG));
				this.getValue($IMG).reset = true;
				this.setValue($T, 0);
				this.setImgSrc(avatarUrl);
			},
			init: function() {
				_self = this;

				/**
				 * window event,bind once only
				 **/
				addEvent(window, 'keydown',
				function(e) {
					var target = e.target,
					_img = _self.getValue($IMG),
					step = e.shiftKey ? 10 : 1;
					if (e.target.tagName != 'INPUT') {
						if ((e.keyCode > 36 && e.keyCode < 41) || (e.keyCode == 107 || e.keyCode == 109 || e.keyCode == 187 || e.keyCode == 189 || e.keyCode == 27 || e.keyCode == 46)) {
							e.preventDefault();
							e.returnValue = false;
						}

						if (e.keyCode > 36 && e.keyCode < 41) {
							switch (e.keyCode) {
							case 37:
								_self.setValue($LEFT, _img.offsetLeft - step);
								break;
							case 38:
								_self.setValue($TOP, _img.offsetTop - step);
								break;
							case 39:
								_self.setValue($LEFT, _img.offsetLeft + step);
								break;
							case 40:
								_self.setValue($TOP, _img.offsetTop + step);
								break;
							}
						} else if (e.keyCode == 107 || e.keyCode == 109 || e.keyCode == 187 || e.keyCode == 189) {
							if (e.keyCode == 107 || e.keyCode == 187) {
								_self.setValue($T, _self.getValue($T) + 1);
							} else {
								_self.setValue($T, _self.getValue($T) - 1);
							}
						} else if (e.keyCode == 27) {
							_self.resetImg();
						} else if (e.keyCode == 46) {
							_self.deleteImg();
						}
					}
				});
			},
			setImgSrc: function(src) {
				this.getValue($IMG).src = src;
			}
		}
	} ();

	avatarPic.init();

	/**
	 * Util
	 **/
	function addEvent(obj, type, handle) {
		if (obj.attachEvent) {
			obj[type + handle] = function(e) {
				handle.call(this, e);
			};
			obj.attachEvent('on' + type, obj[type + handle]);
		} else {
			obj.addEventListener(type, handle, false);
		}
	}

	function removeEvent(obj, type, handle) {
		if (obj.detachEvent) {
			obj.detachEvent('on' + type, obj[type + handle]);
			obj[type + handle] = null;
		} else {
			obj.removeEventListener(type, handle, false);
		}
	}

	function cancel(event) {
		if (event.preventDefault) {
			event.preventDefault();
		}
		return false;
	}

	function saveInit() {
		addEvent(savBtn, 'click', function() {
			var downloadMime = 'image/octet-stream';
		
			if(validAll()){
				imgBase64 = cvs.toDataURL();
				window.open(imgBase64, 'get url');
			}
		});
	}

	function resetInit() {
		addEvent(resetBtn, 'click',
		function() {
			ctx.drawImage(bgImg, 0, 0);
			drawScaleImg(get('.avatarHolder > img'));
			for (var i = 0; i < inputs.length; i++) {
				inputs[i].value = '';
			}
		});
	}

	function buildrealname( name ) {
		var x = 390;
		var v = name;
		
		ctx.font = '700 20px 微软雅黑';
		ctx.fillStyle = '#fff';
		ctx.fillRect(x, 25, 60, 30);
		
		ctx.fillStyle = '#202020';
		ctx.fillText(v, x, 47);
	}

	function builddisplayname(displayname) {
		var x = 458;
		var v = displayname;
		
		ctx.font = '100 12px 宋体';
		ctx.fillStyle = '#fff';
		ctx.fillRect(x, 25, 130, 30);
		ctx.fillStyle = '#666';
		ctx.fillText(v, x, 47);
	}
	
	function buildDept( el ) {
		var x = 390;
		var y = 55;
		var v = el.value;
		
		ctx.font = '700 12px 宋体';
		ctx.fillStyle = '#fff';
		ctx.fillRect(x, y, 300, 20);
		ctx.fillStyle = '#666';
		ctx.fillText(v, x, y + 12);
	}
	
	function buildDefult( el, xy ) {
		var x = xy.x;
		var y = xy.y;
		
		v = (el.getAttribute('data-head') || '') + el.value + (el.getAttribute('data-tail') || '');
		
		ctx.font = '100 12px 宋体';
		ctx.fillStyle = '#fff';
		ctx.fillRect(x, y, 300, 20);
		ctx.fillStyle = '#666';
		ctx.fillText(v, x, y + 12);
	}
	
	function textUpdate() {
		// 真名
		var realname = get('#realname');
		buildrealname(realname.value);
		addEvent(realname, 'keyup', function() {
			buildrealname(this.value);
		});
		
		// 职务
		var position = get('#position');
		builddisplayname(position.value);
		addEvent(position, 'keyup', function() {
			builddisplayname(this.value);
		});
		
		// 部门
		var dept = get('#dept');
		buildDept(dept);
		addEvent(dept, 'keyup', function() {
			buildDept(this);
		});
		
		
		var extraInfoCheck = getAll('#extraInfo .checkboxStyle');
		var inputs = getAll('#extraInfo input[type="text"]');
		
		var buildExtraInfo = function(){
			var x = 390;
			var y = 75;
			
			ctx.fillStyle = '#fff';
			ctx.fillRect(390, 80, 300, 200);
			
			for(var i = 0, len = extraInfoCheck.length; i < len; i++){
				var item = extraInfoCheck[i];
				var input = inputs[i];
				
				if(item.checked === true){
					buildDefult(input, {"x":x,"y":y});
					y = y + 20;
				}
				
			}
			
		}

		for(var i = 0, len = inputs.length; i < len; i++){
			var input = inputs[i];
			var item = extraInfoCheck[i];
			addEvent(input, 'keyup', function() {
				buildExtraInfo();
			});
			addEvent(item, 'click', function() {
				buildExtraInfo();
			});
			
		}
		buildExtraInfo();
		
	}
	
	function isValid(obj) {
		// var reg = new RegExp(obj.getAttribute('data-reg') || '');
		// return reg.test(obj.value);
		
		return true;
	}

	function valid(obj) {
		var result = isValid(obj);
		if (result) {
			obj.style.color = '#000';
		} else {
			obj.style.color = 'red';
		}
		return result;
	}

	function validAll() {
		var result = true;
		var ipt;
		for (var i = 0; i < inputs.length; i++) {
			ipt = inputs[i];
			if (valid(ipt)) {
				result &= true;
			} else {
				result &= false;
			}
		}
		return result;
	}

	function drawScaleImg(img) {
		if (!img){
			return false;
		}
		var rate = avatarPic.getValue($R) ? avatarPic.getValue($R) : 1;
		try {
			//change size. @josson
			ctx.drawImage(img, 0 - img.offsetLeft / rate, 0 - img.offsetTop / rate, 70 / rate, 70 / rate, 295, 29, 81, 81);
		} catch(e) {}
	}

	function afterFileUpload(file) {
		if (!file) return;

		var reader = new FileReader(),
		oldImg = null;

		reader.onload = function(event) {
			if (oldImg = get('.avatarHolder > img')) avatar.removeChild(oldImg);
			var newAvatar = new Image();
			avatarPic.setValue($IMG, newAvatar);
			avatarPic.setImgSrc(event.target.result);
		};
		reader.readAsDataURL(file);
	}
})();