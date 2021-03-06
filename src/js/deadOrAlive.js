let gsap = require("gsap").gsap;
import * as PIXI from "pixi.js";
import { AsciiFilter } from "@pixi/filter-ascii";
import { BulgePinchFilter } from "@pixi/filter-bulge-pinch";
import SampleFilter from "./filter/sampleFilter";
import Main from "./main";
import Vector2 from "./utils/vector2";
import ImgController from "./utils/imgController";
import MangaImg from "./utils/mangaImg";
import MainText from "./utils/mainText";
import AnimationDot from "./utils/animationDot";
import Color from "./utils/color";

export default class DeadOrAlive extends Main {
  constructor() {
    super();

    this.aliveImg;
    this.deadImg;
    this.DeadOrAliveFrag = true;
    this.imgInit();

    this.mangaImgs = [];

    this.dots = [];
    this.dotSpace = 30;
    this.dotSize = 10;

    this.bgBlack;
    this.bgBlackTween;

    this.isSpecialAnimation = false;
    this.isSpecialAnimationTimer;

    this.randomAmountTimer;
    this.randomAmount = 1;

    this.mouseSpeed = 0;
    this.mouseAccumulate = 0;

    this.dispAmount = 0;
    this.dispAmountTween;
    this.dispAmountTween2;
  }

  imgInit() {
    const aliveTex = new PIXI.Texture.from("./assets/img/alive.png");
    this.aliveImg = new MainText(
      aliveTex,
      new Vector2(this.sw / 2, this.sh / 2),
      300,
      0x000000
    );
    this.mainContainer.addChild(this.aliveImg);

    const deadTex = new PIXI.Texture.from("./assets/img/dead.png");
    this.deadImg = new MainText(
      deadTex,
      new Vector2(this.sw / 2, this.sh / 2),
      300,
      0xeaeaea
    );
    this.deadImg.alpha = 0;
    this.mainContainer.addChild(this.deadImg);
  }

  onSetup() {

    this.BulgePinchFilter = new BulgePinchFilter();
    this.BulgePinchFilter.radius = 300;
    this.BulgePinchFilter.strength = 0;
    this.mainContainer.filters = [this.BulgePinchFilter];

    let dispTexure = new PIXI.Texture.from("./assets/img/noise.jpg");
    this.dispSprite = new PIXI.Sprite(dispTexure);
    this.dispFilter = new PIXI.filters.DisplacementFilter(this.dispSprite);
    this.dispFilter.scale.x = this.dispFilter.scale.y = 0;

    this.dispFilterForText = new PIXI.filters.DisplacementFilter(
      this.dispSprite
    );
    this.dispFilterForText.scale.x = this.dispFilterForText.scale.y = 0;

    this.bgContainer.filters = [this.dispFilter];
    this.mainContainer.filters = [
      this.BulgePinchFilter,
      this.dispFilterForText,
    ];

    this.mangaContainer = new PIXI.Container();
  }

  onResize() {
    if (!this.DeadOrAliveFrag) this.drawBgBlack();

    this.aliveImg.position.x = this.sw / 2;
    this.aliveImg.position.y = this.sh / 2;
    this.deadImg.position.x = this.sw / 2;
    this.deadImg.position.y = this.sh / 2;

    this.dotInit();
    this.bgContainer.addChild(this.mangaContainer);
    
  }

  dotInit() {
    for (let i in this.dots) {
      this.bgContainer.removeChild(this.dots[i]);
    }
    this.dots = [];

    const texture = new PIXI.Texture.from("./assets/img/circle.png");

    const loopCount = Math.ceil(
      Math.sqrt(Math.pow(Math.max(this.sw, this.sh), 2)) / this.dotSpace
    );
    let dotNum = 0;
    for (let i = 0; i < loopCount; i++) {
      let dist = this.dotSpace * i; //原点からの距離
      let dotSize = this.isTouchDevice ? this.dotSize * 0.7 : this.dotSize;
      for (let j = 0; j < dotNum; j++) {
        let r = (Math.PI * 2 * j) / dotNum + dotNum; //角度
        let x = this.sw / 2 + Math.sin(r) * dist; //極座標
        let y = this.sh / 2 + Math.cos(r) * dist;
        let dot = new AnimationDot(
          texture,
          new Vector2(x, y),
          dotSize * ((dist / (this.sw / 2)) * 2.5 + 0.2),
          0x871e00
        );
        dot.radius = r;
        dot.dist = dist;
        let minDist = this.isTouchDevice ? 150 : 200;
        if (dist < minDist) dot.alpha = 0;
        this.dots.push(dot);
        this.bgContainer.addChild(dot);
      }

      dotNum += 6;
    }
  }

  onUpdate() {
    let mouseSpeed = Math.sqrt(
      Math.pow(this.mouseMoved.x, 2) + Math.pow(this.mouseMoved.y, 2)
    );
    mouseSpeed /= 5;
    this.mouseSpeed += mouseSpeed;
    this.mouseSpeed *= 0.9; //ちょっとずつ0に戻る
    this.mouseAccumulate += mouseSpeed;
    // this.mouseAccumulate *= 0.99
    if (!this.isSpecialAnimation) {
      for (let i in this.dots) {
        let mouseDist = Math.sqrt(Math.pow(this.mousePosition.x-this.dots[i].position.x, 2) + Math.pow(this.mousePosition.y - this.dots[i].position.y, 2))
        mouseDist = 300 - mouseDist
        mouseDist /= 20
        mouseDist = mouseDist >= 1?mouseDist:1
        let direction = Math.atan2(this.mousePosition.x-this.dots[i].position.x, this.mousePosition.y - this.dots[i].position.y)
        this.dots[i].rotation(
          this.sw,
          this.sh,
          this.mouseSpeed,
          this.randomAmount,
          mouseDist,
          direction
        );
      }
    }

    this.TextVibe();

    //触り続けたら爆発
    let threshold = this.isTouchDevice ? 1000 : 1000;
    if (this.mouseAccumulate > threshold && mouseSpeed > 10) {
      this.mouseAccumulate = 0;

      this.DeadOrAliveFrag ? this.explode() : this.returnToNormal();
      this.DeadOrAliveFrag = !this.DeadOrAliveFrag;
    }

    for (let i in this.mangaImgs) {
      if (this.mangaImgs[i].alpha == 0) {
        this.bgContainer.removeChild(this.mangaImgs[i]);
        this.mangaImgs.splice(i, 1);
      }
    }

    if (this.DeadOrAliveFrag) {
      this.BulgePinchFilter.strength =
        (this.mouseSpeed / 130) * this.randomAmount;
    } else {
      this.dispFilterForText.scale.x = this.dispFilterForText.scale.y =
        this.mouseSpeed * 3 * this.randomAmount;
      this.BulgePinchFilter.strength =
        (this.mouseSpeed / 130) * this.randomAmount;
    }
    this.BulgePinchFilter.strength *= 0.95;
    this.dispFilterForText.scale.x = this.dispFilterForText.scale.y *= 0.95;

    this.dispSprite.rotation += 1;
  }

  TextVibe() {
    let threshold = this.isTouchDevice ? 1000 : 3000;
    let amount = this.mouseAccumulate / threshold;
    let range = 30;
    amount = amount < 0.2 ? 0 : amount;
    this.aliveImg.position.x =
      this.sw / 2 + (Math.random() - 0.5) * range * amount;
    this.aliveImg.position.y =
      this.sh / 2 + (Math.random() - 0.5) * range * amount;
    this.deadImg.position.x =
      this.sw / 2 + (Math.random() - 0.5) * range * amount;
    this.deadImg.position.y =
      this.sh / 2 + (Math.random() - 0.5) * range * amount;
  }

  explode() {
    if (this.dispAmountTween) this.dispAmountTween.kill();
    this.dispAmountTween = gsap.to(this.dispFilter.scale, {
      x: 200,
      y: 200,
      duration: 1,
      ease: "elastic.out(5)",
    });

    this.changeState();
    //生の文字爆発
    this.aliveImg.explode(1, "elastic.out(5)");
    this.deadImg.appear(1, "elastic.out(5)");

    this.drawBgBlack();
  }

  changeState() {
    if (this.dispAmountTween2) this.dispAmountTween2.kill();
    this.dispAmountTween2 = gsap.timeline();
    this.dispAmountTween2.to(this.dispFilterForText.scale, {
      x: 400,
      y: 400,
      duration: 1,
      ease: "elastic.out(5)",
    });
    this.dispAmountTween2.to(this.dispFilterForText.scale, {
      x: 0,
      y: 0,
      duration: 1,
      ease: "elastic.out(5)",
    });
  }

  drawBgBlack() {
    if (this.bgBlack) this.bgBlack.clear();
    this.bgBlack = new PIXI.Graphics();
    this.bgBlack.width = this.sw;
    this.bgBlack.height = this.sh;
    this.bgBlack.x = this.bgBlack.y = 0;
    this.bgBlack.beginFill(0x000000);
    this.bgBlack.drawRect(0, 0, this.sw, this.sh);
    this.bgBlack.endFill();
    this.bgBlack.zIndex = -99;
    this.bgBlack.alpha = 0;
    this.bgContainer.addChild(this.bgBlack);

    if (this.bgBlackTween) this.bgBlackTween.kill();
    this.bgBlackTween = gsap.to(this.bgBlack, {
      alpha: 1,
      duration: 1,
      ease: "expo.out",
    });
  }

  returnToNormal() {
    if (this.dispAmountTween) this.dispAmountTween.kill();
    this.dispAmountTween = gsap.to(this.dispFilter.scale, {
      x: 0,
      y: 0,
      duration: 1,
      ease: "back.out()",
    });

    this.changeState();
    //生の文字爆発
    this.aliveImg.appear(1, "elastic.out(5)");
    this.deadImg.explode(1, "elastic.out(5)");

    this.removeBgBlack();
  }

  removeBgBlack() {
    if (this.bgBlackTween) this.bgBlackTween.kill();
    this.bgBlackTween = gsap.to(this.bgBlack, {
      alpha: 0,
      duration: 1,
      ease: "expo.out",
    });
  }

  onClick() {
    if (this.randomAmountTimer) this.randomAmountTimer.kill();
    this.randomAmountTimer = gsap.timeline();
    this.randomAmountTimer.to(this, {
      randomAmount: 0,
      duration: 1,
      ease: "elastic.out(8)",
    });
    this.randomAmountTimer.to(this, {
      randomAmount: 1,
      duration: 1,
      ease: "expo.inOut()",
    });

    this.popUpMangaImg();
  }

  //漫画効果音
  popUpMangaImg() {
    let i = Math.ceil(Math.random() * 4);
    let mangaTexture = `./assets/img/manga/manga${i}.png`;
    let texture = new PIXI.Texture.from(mangaTexture);
    let tint = this.DeadOrAliveFrag ? 0x000000 : 0xeaeaea;
    let mangaImg = new MangaImg(
      texture,
      new Vector2(this.sw / 2, this.sh / 2),
      100,
      tint
    );
    mangaImg.popUp(1, "elastic");

    this.mangaContainer.addChild(mangaImg);
    this.mangaImgs.push(mangaImg);
  }

  
}
