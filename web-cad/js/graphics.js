/**
 * The script to help you draw 2d graphics on the canvas element with mouse and keys
 */
package('hc.graphic');

// !!! hc.graphic.DrawableGraphic.proto=proto; Problem will occur to this
// kind of inheritance all sub class will share the same 'styles' array in the

/**
 * the drawing context is a drawing evironment, argument canvas may be canvas
 * html element or canvas id DrawingContext states: basic editing drawing, each
 * state has corresponding listener
 */
hc.graphic.DrawingContext = function(canvas) {
	if (typeof canvas == 'string')
		canvas = document.getElementById(canvas); // the canvas html element

	// memembers
	this.drawables = []; 	// c:Drawble; holds all the drawing element
	this.drawable = null;	// c:Drawble; the current drawable that is drawing
	this.ctrlRings=[];		//c:ControlRing subclass of Circle set of circles, exist when editing
	this.hoverRing=null;		// Ring index
	this.lstn = this.constructor.lstn.viewer;
	this.canvas = canvas;
	canvas.context = this;
	this.dragStartLoc=null;	//dragging start position
	// translate and scale
	this.scale = 1;
	this.translate = {x:0, y:0};

	// member functions

	this.repaint = function() {
		canvas.height = canvas.clientHeight;
		canvas.width = canvas.clientWidth;
		var c = canvas.getContext('2d');
		c.save();
		
		// set the coordination
		c.translate(0, canvas.height);
		c.scale(1, -1);
		var t = this.translate;
		c.translate(t.x, t.y);
		c.scale(this.scale, this.scale);
	// 1 paint the drawables
		for ( var i in this.drawables) {
			this.drawables[i].draw(c);
		}
		c.restore();
		
	// 2 draw miter	
		var len = 15;
		var dist = 25;
		// draw meter
		c.beginPath();
		// draw the horizontal scale
		for ( var x = 0; x <= canvas.width; x += dist) {
			c.moveTo(x, 0);
			c.lineTo(x, len);
		}
		// draw the vertical scale
		for ( var y = 0; y <= canvas.height; y += dist) {
			c.moveTo(0, y);
			c.lineTo(len, y);
		}
		c.closePath();
		c.strokeStyle = 'rgba(255,255,255,0.2)';
		c.stroke();
		
		for ( var i in this.ctrlRings) {
			this.ctrlRings[i].draw(c);
		}
	};
	this.repaint();

	
	//pt is in the ui
	this.scaleBy=function(p,fac){
		ctx.scale*=fac;
		//new translate
		var t=ctx.translate;
		t.x=p.x-(p.x-t.x)*fac;
		t.y=p.y-(p.y-t.y)*fac;
		ctx.canvas.getContext('2d').lineWidth=1/this.scale;
		ctx.repaint();
	};
	
	//transform the coordinate in the drawable to the ui point
	this.toUILoc=function(crd){
		var x=crd.x;
		var y=crd.y;
		x=x * this.scale + this.translate.x;
		y=y * this.scale + this.translate.y;
		y=this.canvas.height - y;
		return {x:x, y:y};
	};

	/**
	 * 1 Drawing context state transform To drawinging pass drawable constructor
	 * as the argument
	 */
	this.draw = function(d) {
		this.lstn = d.creator;
		if(this.drawable)
			delete this.drawable.altStyle;
		this.ctrlRings=[];
		if(d.creator.onCreate)
			d.creator.onCreate(this);
		if(this.drawable)
			this.drawables.push(this.drawable);
	};
	
	this.setMode=function(mode){
		switch(mode){
		case 'view': 
			this.lstn=this.constructor.lstn.viewer;
			if(this.drawable)
				delete this.drawable.altStyle;
		break;
		case 'select': this.lstn=this.constructor.lstn.selector; break;
		};
		this.ctrlRings=[];
		this.repaint();
	};
	
	//4 modes
	this.getMode=function(){
		switch(this.lstn){
		case this.constructor.lstn.viewer: return 'view';
		case this.constructor.lstn.editor: return 'editing';
		case this.constructor.lstn.selector: return 'selecting';
		default: return 'drawing';
		}
	};


	/**
	 * 3 Drawing context state transform To editing pass drawable constructor as
	 * the argument
	 */
	this.edit = function(d) {
		this.lstn = this.constructor.lstn.editor;
		this.ctrlRings=d.getCtrlPts(this);
		this.drawable=d;
		d.altStyle=hc.graphic.Drawable.styles.editing;
		this.repaint();
	};

	/**
	 * Calculate the cursor position on the UI and in the canvas drawing
	 * context(after transformed)
	 * 
	 * @param event
	 */
	canvas.onmousemove = function(evt) {
		var ctx = this.context;
		// calculate the current mouse position for app use
		// var ctx2d = this.getContext('2d');
		var crd = {};
		if (evt.offsetX) {
			crd.x = evt.offsetX;
			crd.y = evt.offsetY;
		} else {
			crd.x = evt.clientX + window.scrollX - canvas.offsetLeft;
			crd.y = evt.clientY + window.scrollY - canvas.offsetTop;
			// console.warn('Position may be wrong');
		}
		// the current mouse location in the ui
		ctx.loc = {
			x : crd.x,
			y : crd.y
		};//console.log(crd.x, crd.y);
		//the current mouse location in the drawable coordinate
		crd.y = canvas.height - crd.y;
		
		crd.x-=ctx.translate.x;
		crd.x/=ctx.scale;
		
		crd.y-=ctx.translate.y;
		crd.y/=ctx.scale;
		
		ctx.crd = crd;
		// show the coordinate
		this.title = crd.x + ',' + crd.y;

		var l=ctx.lstn;
		if (ctx.dragStartLoc) {
			if (l.onDrag)
				l.onDrag(ctx, evt);
		} else if(l.onMousemove)
			l.onMousemove(ctx, evt);
	};

	canvas.onmousedown = function(evt) {
		var ctx = this.context;
		ctx.dragStartLoc = ctx.loc;
		try {
			ctx.lstn.onMousedown(ctx, evt);
		} catch (e) {
		//	console.log(e);
		}
	};

	canvas.onmouseup = function(evt) {
		var ctx = this.context;
		delete ctx.dragStartLoc;
		try {
			ctx.lstn.onMouseup(ctx, evt);
		} catch (e) {
			// console.warn('Mouse up method is not impelment by the
			// listener',e);
		}
	};
	
	//not support in Firefox
	canvas.onmousewheel=function(evt){//console.log('mouse wheel',evt);
		var ctx=this.context;
		if(ctx.lstn.onWheel){
			ctx.lstn.onWheel(ctx, evt.wheelDelta>0);
			evt.preventDefault();
		}
	};
	//not supported in chrom opera
	canvas.addEventListener('DOMMouseScroll',function(evt){//console.log('dom mouse scroll');
		var ctx=this.context;
		if(ctx.lstn.onWheel){
			ctx.lstn.onWheel(ctx, evt.detail<0);
			evt.preventDefault();
		}
	},false);

	canvas.onmouseover = function(evt) {
		canvas.cursorIn = true;
	};

	canvas.onmouseout = function(evt) {
		canvas.cursorIn = false;
		var ctx=this.context;
		delete ctx.dragStartLoc;
		ctx.repaint();
	};

	window.addEventListener('keydown', function(evt) {
		if (!canvas.cursorIn)
			return;
	}, false);

	window.addEventListener('keyup', function(evt) {
		if (!canvas.cursorIn)
			return;// console.log(evt);
		var ctx = canvas.context;
		if (ctx.lstn.onKeyup)
			ctx.lstn.onKeyup(ctx, evt);
	}, false);

};

// The listener for different state of the drawing context
// general listener for canvas when not drawing
// used when canvas is not drawing, not selected
hc.graphic.DrawingContext.lstn = {
		//just translate and scale the whole graph, not to select
		viewer:{
			// for translate
			onMousedown:function(ctx) {
				var t=ctx.translate;
				this.sT={x:t.x, y:t.y};// start position
			},
			onDrag:function(ctx){
				//Set the new translation
				var t=ctx.translate;
				var o=ctx.dragStartLoc;//original
				var n=ctx.loc; //new location
				t.x=this.sT.x+n.x-o.x;
				t.y=this.sT.y+o.y-n.y;
				
				ctx.repaint();
				var ctx2d=ctx.canvas.getContext('2d');//console.log(ctx2d);
				ctx2d.beginPath();
				ctx2d.moveTo(o.x, o.y);
				ctx2d.lineTo(n.x, n.y);
				ctx2d.strokeStyle='#fff';
				ctx2d.stroke();
			},
			onMouseup:function(ctx){
				ctx.repaint();
			},
			//for scale
			onWheel:function(ctx,up){
				var fac=0.1;
				if(up)
					fac+=1;
				else
					fac=1-fac;
				var p=ctx.loc;
				ctx.scaleBy({x:p.x, y:ctx.canvas.height-p.y},fac);
			}
		},
	selector : {
		onMousemove : function(ctx) {
			/**
			 * find the drawble under the mouse if not drawing and change the
			 * style of this drawable
			 */
			var ctx2d = ctx.canvas.getContext('2d');
			var prv = ctx.drawable;
			delete ctx.drawable;
			var nHover;
			var ds=ctx.drawables;
			for ( var i in ds) {//console.log(ctx.drawables[i],'contains',ctx.loc,':',ctx.drawables[i].isPointIn(ctx.loc, ctx2d));
				if (ds[i].isPointIn(ctx.crd, ctx2d)) {
					nHover = ds[i];
					break;
				}
			}
			ctx.drawable=nHover;
			//hover the drawable or not
			if (nHover != prv) {
				if(prv)
					delete prv.altStyle;
				if(nHover)
					nHover.altStyle=hc.graphic.Drawable.styles.hover;
				ctx.repaint();
			}
		},
		onMousedown : function(ctx) {
			if (ctx.drawable) {
				ctx.edit(ctx.drawable);
			}
		},
	},
	
	editor : {
		onMousemove : function(ctx) {
			/**
			 * find the drawble under the mouse if not drawing and change the
			 * style of this drawable
			 */
			var ctx2d = ctx.canvas.getContext('2d');
			var prv = ctx.hoverRing;
			delete ctx.hoverRing;
			var nHover;
			var rings=ctx.ctrlRings;
			for ( var i in rings) {//console.log(ctx.drawables[i],'contains',ctx.loc,':',ctx.drawables[i].isPointIn(ctx.loc, ctx2d));
				if (rings[i].isPointIn(ctx.loc, ctx2d)) {
					nHover = rings[i];
					break;
				}
			}
			ctx.hoverRing=nHover;
			//hover the drawable or not
			if (nHover != prv) {
				if(prv)
					delete prv.altStyle;
				if(nHover)
					nHover.altStyle=hc.graphic.ControlRing.styles.hover;
				ctx.repaint();
			}	
		},
		onDrag : function(ctx) {
			//control points
			var rings = ctx.ctrlRings;
			var hoverR=ctx.hoverRing;
			if (hoverR) {
				// ctx.canvas.style.cursor='cursor'; to fix chrome cursor on
				// dragging
				var rc=hoverR.center
				var lc=ctx.loc;
				rc.x=lc.x;
				rc.y=lc.y;
				hoverR.move(ctx);
				ctx.repaint();
			}
		},
		onMousedown : function(ctx) {
			var ctx2d = ctx.canvas.getContext('2d');
			if (!ctx.drawable.isPointIn(ctx.crd, ctx2d)
					&& !ctx.hoverRing) {
				ctx.setMode('view');
			}
		},
		onMouseup: function(ctx){
			var hRing=ctx.hoverRing;
			if(hRing && hRing.onCtrlEnd){
				hRing.onCtrlEnd();
			}
		}
	}
};

// The abstract graphic object which can be drawn to the canvas directly
// !important class
hc.graphic.Drawable = function() {
	this.style = {strokeStyle:'pink'};
	this.altStyle={}; // not to stored
	this.styles=hc.graphic.Drawable.styles;
	//called by sub
	this.draw = function(ctx2d) {
		ctx2d.beginPath();
		this.path(ctx2d);
		ctx2d.closePath();
		this.styles.apply(this.style, ctx2d, this.altStyle);
		if(this.style.strokeStyle){
			ctx2d.stroke();
		}
			
		
		if(this.style.fillStyle)
			ctx2d.fill();
	};

	this.isPointIn = function(pt, ctx2d) {
		ctx2d.beginPath();
		this.path(ctx2d);//console.log(JSON.stringify(pt),ctx2d.isPointInPath(pt.x, pt.y));
		ctx2d.closePath();
		return ctx2d.isPointInPath(pt.x, pt.y);
	};

	this.path = function(ctx2d) {
		throw new Error('This method should always be overriden');
	};

	this.getCtrlPts = function() {
		return [];
	};
};

//style control system
hc.graphic.Drawable.styles = {
		dft : {// the default style
			// compositing
			globalAlpha : 1.0,
			globalCompositeOperation : 'source-over',

			// colors and styles
			strokeStyle : '#fff',
			fillStyle : 'yellow',

			// line styles
			//lineWidth : 1,
			lineCap : 'round',// butt, round, square
			lineJoin : 'round',// round, bevel, miter
			miterLimit : 10
		},
		hover : {
			strokeStyle : 'blue',
			lineWidth : 1
		},
		editing : {
			strokeStyle : 'green'
		},
		/**
		 * apply this custom style to the 2d context
		 * 
		 * @param custom
		 * @param ctx2d
		 */
		apply : function(custom, ctx2d, alt) {
			var s;
			for (s in this.dft) {
				ctx2d[s] = custom[s] || this.dft[s];
			}
			if(alt)
				for (s in alt) {
					ctx2d[s] = alt[s];
				}
		}
	};

// drawline and its listener
hc.graphic.Line = function() {
	hc.graphic.Drawable.call(this);
	this.points = [];
	this.path = function(ctx) {
		var firstPoint = true;
		for ( var i in this.points) {
			if (firstPoint) {
				ctx.moveTo(this.points[i].x, this.points[i].y);
				firstPoint = false;
			} else {
				ctx.lineTo(this.points[i].x, this.points[i].y);
			}
		}
	};

	this.getCtrlPts = function(ctx) {
		var rings=[];
		for(var i=0;i<this.points.length;i++){
			var p=this.points[i];
			rings.push(new hc.graphic.ControlRing(p, ctx.toUILoc(p)));
		}
		return rings;
	};
};
/**
 * The listener for create a line drawable
 */
hc.graphic.Line.creator = {
		onCreate:function(ctx){
			ctx.drawable=new hc.graphic.Line();
		},
	onMousedown : function(ctx) {
		ctx.drawable.points.push(ctx.crd);
	},
	onMousemove : function(ctx) {
		var pts = ctx.drawable.points;
		if (pts.length == 0)
			return;
		// log('drawing line when mouse move');
		pts.push(ctx.crd);
		ctx.repaint();
		pts.pop();
	},
	onKeyup : function(ctx, evt) {
		if (ctx.drawable.points.length < 2)
			return;
		if ('C'.charCodeAt(0) == evt.keyCode) {
			ctx.setMode('view');
		}
	}
};

// draw circle and its listener
hc.graphic.Circle = function(center, radius,style) {
	hc.graphic.Drawable.call(this);
	if(style)
		this.style=style;
	this.center = center;
	this.radius = radius;
	this.path = function(ctx2d) {
		var c = this.center;
		ctx2d.arc(c.x, c.y, this.radius, 0, Math.PI * 2,true);
		/*var cr=2;
		ctx2d.moveTo(c.x+cr,c.y);
		ctx2d.arc(c.x, c.y, cr, 0, Math.PI * 2);*/
	};
	this.getCtrlPts = function(ctx) {
		var c=this.center;
		var r=this.radius;
		var cRing=new hc.graphic.ControlRing(c, ctx.toUILoc(c));
		var rRing=new hc.graphic.ControlRing(this, ctx.toUILoc({x:c.x+r, y:c.y}));
		cRing.radiusRing=rRing;
		cRing.center.dx=r*ctx.scale;
		cRing.center.dy=0;
		cRing.move=function(ctx){
			var c=this.target;//center
			var n=ctx.crd;	//new coord
			c.x=n.x;
			c.y=n.y;

			var cc=this.center;
			var rc=this.radiusRing.center;
			rc.x=cc.x+cc.dx;
			rc.y=cc.y+cc.dy;
		//	console.log('move:',cc);
		};
		rRing.centerRing=cRing;
		rRing.move=function(ctx){
			var t=this.target;
			t.radius=hc.geom.dist(t.center,ctx.crd);
		};
		rRing.onCtrlEnd=function(){
			var rc=this.center;
			var cc=this.centerRing.center;
			cc.dx=rc.x-cc.x;
			cc.dy=rc.y-cc.y;
			//console.log(cc);
		};
		return [ cRing, rRing ];
	};
};

hc.graphic.Circle.creator = {
	onMousedown : function(ctx) {
		ctx.drawable = new hc.graphic.Circle(ctx.crd,2);
		ctx.drawables.push(ctx.drawable);
		ctx.repaint();
	},
	onDrag : function(ctx) {
		var x = ctx.crd.x;
		var y = ctx.crd.y;
		var c = ctx.drawable.center;
		ctx.drawable.radius = Math.sqrt(Math.pow(x - c.x, 2)
				+ Math.pow(y - c.y, 2));
		ctx.repaint();
	},
	onMouseup : function(ctx) {
		ctx.commit();
	}
};

/**
 * this drawable is drawn on the UI coordination
 * center is in the ui coordinate
 */
hc.graphic.ControlRing=function(target,center){
	this.target=target;//may be a point by default, or a drawable
	hc.graphic.Circle.call(this,center,6,this.constructor.styles.dft);
	this.move=function(ctx){//default consider the target as a point to control
		var t=this.target;
		var c=ctx.crd;
		t.x=c.x;
		t.y=c.y;
	};
};
//
hc.graphic.ControlRing.styles={
		dft:{globalAlpha:0.8,strokeStyle:'pink'},
		hover:{strokeStyle:'blue'}
};

hc.graphic.Rectangle = function() {
	hc.graphic.DrawableGraphic.call(this);
	this.styles[hc.graphic.StyleNames.indexOf('fillStyle')] = false;
	this.p1 = null;
	this.p2 = null;
	this.draw = function(context2d) {
		var x = Math.min(this.p1.x, this.p2.x);
		var y = Math.min(this.p1.y, this.p2.y);
		var w = Math.abs(this.p1.x - this.p2.x);
		var h = Math.abs(this.p1.y - this.p2.y);
		if (this.styles[0] !== false) {
			context2d.fillRect(x, y, w, h);
			// log('fillStyle:'+context2d.fillStyle);
		}

		if (this.styles[1] !== false) {
			context2d.strokeRect(x, y, w, h);
		}
	};
};
hc.graphic.RectBuilder = function() {
	hc.graphic.GBuilder.call(this);
	this.graph = new hc.graphic.Rectangle();
	this.onMouseDown = function(drawingContext) {
		this.graph.p1 = drawingContext.crd;// log(drawingContext.context2d);
	};
	this.onMouseMove = function(drawingContext) {
		if (this.graph.p1 == null)
			return;
		drawingContext.repaint();
		this.graph.p2 = drawingContext.crd;
		this.graph.draw(drawingContext.context2d);
	};
	this.onMouseUp = function(drawingContext) {
		var g = this.graph;
		if (g.p1 && g.p2)
			drawingContext.commit();
		var fill = g.styles[0];
		var stroke = g.styles[1];
		this.graph = new hc.graphic.Rectangle();
		this.graph.styles[0] = fill;
		this.graph.styles[1] = stroke;
	};
};