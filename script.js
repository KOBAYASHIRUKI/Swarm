"use strict";
// 1行目に記載している 'use strict' は削除しないでください

let canvas; //グローバル変数としてキャンバスオブジェクトを参照できるようにする
let context; //上と同じ理由　（これ何？）
let lastTime; //最終フレームの時間
// let counter = 0; //カウンター
let boardWidth = 516; //キャンバスの高さと幅
let boardHeight = 256;
let puck;
let paddle1;
let paddle2;

// パックオブジェクト（白球？）(クラス判定だから大文字？)
// 引数はパックの初期位置
function Puck(x, y) {
    let self = this; //puckのインスタンスを参照できるようにself変数の中にthisを格納する

    self.radius = 5; //パックの大きさ（半径５の円）
    self.x = x; //インスタンス作成時パックの初期位置を設定できるよう（中心の座標）
    self.y = y;
    self.speed = 0.5; //速度の変数
    self.vel = {
        x: 0.2,
        y: 0.1,
    }; // self.velX = 0.1; self.velY = 0.1;  向きのベクトル（Xが水平方向）（Yが垂直方向）

    normalize(self.vel);

    // パックの位置を更新する関数（パックを動かしていくためにはパックを描画するのではなく更新が必要）、
    // 引数dtは経過時間
    self.update = function (dt) {
        self.x += self.vel.x * self.speed * dt; //移動後の座標（水平方向）　速さベクトル
        self.y += self.vel.y * self.speed * dt; //（垂直方向）

        // 上下左右で座標を比較して、はみ出る位置で速度を反転させる

        // 右の壁での跳ね返り
        if (self.x + self.radius > boardWidth) {
            self.vel.x *= -1;
            self.x = boardWidth - self.radius;
        }
        // 左の壁での跳ね返り
        if (self.x - self.radius < 0) {
            self.vel.x *= -1;
            self.x = self.radius;
        }
        // 下の壁での跳ね返り
        if (self.y + self.radius > boardHeight) {
            self.vel.y *= -1;
            self.y = boardHeight - self.radius;
        }
        // 上の壁での跳ね返り
        if (self.y - self.radius < 0) {
            self.vel.y *= -1;
            self.y = self.radius;
        }
    };

    // 呼び出されるとパックをキャンバスに描画する関数
    self.draw = function (context) {
        // 下４行円の描画
        context.fillStyle = "white"; //塗りつぶしのスタイルを指定
        context.beginPath(); //現在のパスをリセットして新しいパスを作成することができる
        context.arc(self.x, self.y, self.radius, 0, 2 * Math.PI); //context.arcは本来扇型を描画する関数ですが、中心角を360度(radianで設定するため2π)にすることで円が描ける
        context.fill(); //パスの内部エリアを塗りつぶす

        // // 衝突判定テスト用
        // let fillColor = "white";
        // if (
        //     self.collidesWithPaddle(paddle1) ||
        //     self.collidesWithPaddle(paddle2)
        // ) {
        //     fillColor = "red";
        // }

        // context.fillStyle = fillColor;
        // context.beginPath();
        // context.arc(self.x, self.y, self.radius, 0, 2 * Math.PI);
        // context.fill();
    };

    // パドルと衝突した時にtrueを返す関数
    self.collidesWithPaddle = function (paddle) {
        // 衝突した点？座標？
        let closestPoint = self.closestPointOnPaddle(paddle); //closestPointOnPaddle関数をcollidesWithPaddle関数で使用するように修正

        //パックの中心と衝突した点の距離を求めるための2点間のベクトル
        let diff = {
            x: self.x - closestPoint.x,
            y: self.y - closestPoint.y,
        };

        // ベクトルの長さ
        let length = Math.sqrt(diff.x * diff.x + diff.y * diff.y);

        return length < self.radius;
    };

    // 最も近いパドルの点を求める関数（法線を求めるため）
    self.closestPointOnPaddle = function (paddle) {
        return {
            x: clamp(
                self.x,
                paddle.x - paddle.halfWidth,
                paddle.x + paddle.halfWidth
            ),
            y: clamp(
                self.y,
                paddle.y - paddle.halfHeight,
                paddle.y + paddle.halfHeight
            ),
        };
    };

    // 衝突を扱う、新しいパックの速さを返す関数
    self.handlePaddleCollision = function (paddle) {
        let collisionHappened = false;
        // パドルと衝突の判定
        // パックとパドルが衝突しなくなるまで、速さベクトルに沿って進行方向逆向きに移動
        // 衝突判定がfalseになるまで、現在の位置からvelを減算
        while (self.collidesWithPaddle(paddle)) {
            self.x -= self.vel.x;
            self.y -= self.vel.y;

            collisionHappened = true;
        }

        // collisionHappenedがtrueの時（衝突が発生した場合）跳ね返る
        if (collisionHappened) {
            let closestPoint = self.closestPointOnPaddle(paddle); //closestPointOnPaddle関数をhandlePaddleCollisionで使用して、最も近い点を求める

            // 法線ベクトル
            let normal = {
                x: self.x - closestPoint.x,
                y: self.y - closestPoint.y,
            };

            // 法線ベクトルの単位ベクトル化
            normalize(normal);

            let dotProd = dot(self.vel, normal);

            self.vel.x = self.vel.x - 2 * dotProd * normal.x;
            self.vel.y = self.vel.y - 2 * dotProd * normal.y;

            // self.vel.x *= -1;
        }
    };
}

// Paddleクラスの定義
// 引数はx座標（y座標をプログラム内で決定すると左右に動かないようになる）
// 第二引数と第三引数はキーコードの割り当てを定義
function Paddle(x, upKeyCode, downKeyCode) {
    let self = this;

    self.x = x; // パドルのx座標の位置表すプロパティ
    self.y = boardHeight / 2; //パドルのy座標の初期値の設定

    self.halfWidth = 5; //パドルの幅と高さの設定
    self.halfHeight = 20;
    self.moveSpeed = 0.5; //パドルの移動速度を定義
    self.upButtonPressed = false; //押されたキーの判定用変数（上へ移動するのか下へ移動するのか）
    self.downButtonPressed = false;
    self.upKeyCode = upKeyCode; //クラス変数にセット
    self.downKeyCode = downKeyCode;

    //引数keyCodeはどのキーが押されたかを識別する整数
    self.onKeyDown = function (keyCode) {
        if (keyCode === self.upKeyCode) {
            self.upButtonPressed = true;
        }
        if (keyCode === self.downKeyCode) {
            self.downButtonPressed = true;
        }
    };

    self.onKeyUp = function (keyCode) {
        if (keyCode === self.upKeyCode) {
            self.upButtonPressed = false;
        }
        if (keyCode === self.downKeyCode) {
            self.downButtonPressed = false;
        }
    };

    //押されたキーに対応してパドルを操作可能にする関数
    self.update = function (dt) {
        if (self.upButtonPressed) {
            self.y -= self.moveSpeed * dt; //dtをかけることで時間に依存するようなる
        }

        if (self.downButtonPressed) {
            self.y += self.moveSpeed * dt;
        }

        //パドルの移動に制限をかける
        if (self.y - self.halfHeight < 0) {
            self.y = self.halfHeight;
        }
        if (self.y + self.halfHeight > boardHeight) {
            self.y = boardHeight - self.halfHeight;
        }
    };

    // パドルを描画する関数
    self.draw = function (context) {
        context.fillStyle = "white";

        // 長方形を描くための各座標と幅と高さ
        context.fillRect(
            self.x - self.halfWidth,
            self.y - self.halfHeight,
            self.halfWidth * 2,
            self.halfHeight * 2
        );
    };
}

// 円の中心と最も近い長方形の外周の点を計算する関数
// val 円の中心のx座標,　min　長方形のx座標(y座標)の最小値,　max　長方形のx座標(y座標)の最大値
function clamp(val, min, max) {
    // valとmaxでより小さい値とminでより大きい値を返す（パックが接するパドルの面を出す？？？）
    return Math.max(min, Math.min(max, val));
}

// ベクトルの長さを求める関数
// 引数はベクトル
function vecLength(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
}

// 長さが１のベクトルである単位ベクトルを求める関数
function normalize(v) {
    let len = vecLength(v);

    // 単位ベクトルはベクトルの長さを（x,y）で割って求める
    if (len > 0) {
        v.x /= len;
        v.y /= len;
    }
}

// ドット積を求める関数
// ドット積とは2つのベクトルのなす角(向きの違い)を数値化したもの
function dot(u, v) {
    return u.x * v.x + u.y * u.y;
}
// キャンバスなどのゲームに必要な各変数の初期化と、
// イベントハンドラ（イベントが発生したときに呼び出される処理）の登録
function init() {
    // console.log("init!");
    canvas = document.getElementById("game-canvas"); //idの取得
    canvas.width = boardWidth;
    canvas.height = boardHeight;

    //初期化
    puck = new Puck(100, 100);
    paddle1 = new Paddle(10, 87, 83); //87=W, 83=S
    paddle2 = new Paddle(boardWidth - 10, 38, 40); //38=上矢印, 40=下矢印

    //キーボードの入力処理
    //押されたときに発火するイベント
    document.addEventListener("keydown", function (e) {
        e.preventDefault();

        //onKeyDown関数を呼び出す
        paddle1.onKeyDown(e.keyCode);
        paddle2.onKeyDown(e.keyCode);
    });

    //離されたときに発火するイベント
    document.addEventListener("keyup", function (e) {
        e.preventDefault();

        paddle1.onKeyUp(e.keyCode);
        paddle2.onKeyUp(e.keyCode);
    });

    context = canvas.getContext("2d"); //キャンバス要素であるcontextを取得しする（キャンバスに線や図形を描画したり、色をつけたりすることが出来る）

    lastTime = performance.now(); //現在時刻のミリ秒の取得
}

// 1秒間で60回呼び出される、フレームごとのゲームの状態を更新する機能を担当する関数(時間と連動するためにdtを引数)
function update(dt) {
    // counter += 1;
    // console.log(counter);

    // update関数内でパックのインスタンスが持つupdate関数を呼び出す
    puck.update(dt);
    paddle1.update(dt);
    paddle2.update(dt);

    puck.handlePaddleCollision(paddle1);
    puck.handlePaddleCollision(paddle2);
}

// 現在のゲームの状態をキャンバスに書き出す機能を担当する関数(時間と連動するためにdtを引数)
function render(dt) {
    // console.log("render!");

    // 新しいパックを描画する前に綺麗にキャンバスを初期化する関数
    // 初期化したい範囲を長方形で指定する
    context.clearRect(0, 0, canvas.width, canvas.height);

    // パックを描画する関数
    puck.draw(context);
    // パドルを描画する関数
    paddle1.draw(context);
    paddle2.draw(context);
}

// update関数とrender関数を呼び出す関数
function main() {
    let now = performance.now(); //現在時刻を格納
    let dt = now - lastTime; //フレームの時刻と現在時刻の差を格納
    let maxFrameTime = 1000 / 60;

    // フレーム間の時間差を制限（dtの最大値を設定）することでdtが大きくなりすぎることを防ぐ（＊あとで実験）
    if (dt > maxFrameTime) {
        dt = maxFrameTime;
    }

    update(dt);
    render(dt);

    lastTime = now; //フレーム毎に時間を計測するために最終フレームの時刻を更新

    requestAnimationFrame(main); //requestAnimationFrameを使用してmain自身を呼び出すことで、mainが実行されると、16ミリ秒ごとにmainを呼び出すループ (次のアニメーションフレームを呼び出す関数を引数にとる)（別のタブを見ているときは中断される）
}

// ループの仕組みの実行
init(); //ゲームの初期化
main(); //ループ