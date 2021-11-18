import Phaser from 'phaser'
import PlayerSelector from './PlayerSelector'

enum PlayerState {
  IDLE,
  SITTING,
}

/**
 * shifting distance for sitting animation
 * format: direction: [xShift, yShift, depthShift]
 */
const sittingShiftData = {
  up: [0, 3, -1],
  down: [0, 3, 1],
  left: [0, -8, 1],
  right: [0, -8, 1],
}

declare global {
  namespace Phaser.GameObjects {
    interface GameObjectFactory {
      player(x: number, y: number, texture: string, frame?: string | number): Player
    }
  }
}

export default class Player extends Phaser.Physics.Arcade.Sprite {
  private _playerState = PlayerState.IDLE
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene, x, y, texture, frame)

    this.anims.play('player_idle_down', true)
  }

  get playerState() {
    return this._playerState
  }

  update(playerSelector: PlayerSelector, cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
    if (!cursors) {
      return
    }

    const keyE = this.scene.input.keyboard.addKey('E')
    const item = playerSelector.selectedItem
    const speed = 200

    switch (this.playerState) {
      case PlayerState.IDLE:
        // if press E in front of selected item (chair)
        if (Phaser.Input.Keyboard.JustDown(keyE) && item) {
          /**
           * move player to the chair and play sit animation
           * a delay is called to wait for player movement (from previous velocity) to end
           */
          this.scene.time.addEvent({
            delay: 10,
            callback: () => {
              this.setVelocity(0, 0)
              this.setPosition(
                item.x + sittingShiftData[item.itemType][0],
                item.y + sittingShiftData[item.itemType][1]
              ).setDepth(item.depth + sittingShiftData[item.itemType][2])
              this.play(`player_sit_${item.itemType}`, true)
              playerSelector.setPosition(0, 0)
            },
            loop: false,
          })
          // set up new dialog as player sits down
          item.clearDialogBox()
          item.setDialogBox('Eキーで立とう', 83)
          this._playerState = PlayerState.SITTING
          return
        } else if (cursors.left?.isDown) {
          this.play('player_run_left', true)
          this.setVelocity(-speed, 0)
        } else if (cursors.right?.isDown) {
          this.play('player_run_right', true)
          this.setVelocity(speed, 0)
        } else if (cursors.up?.isDown) {
          this.play('player_run_up', true)
          this.setVelocity(0, -speed)
          this.setDepth(this.y) //Changes player.depth if player.y changes
        } else if (cursors.down?.isDown) {
          this.play('player_run_down', true)
          this.setVelocity(0, speed)
          this.setDepth(this.y) //Changes player.depth if player.y changes
        } else {
          const parts = this.anims.currentAnim.key.split('_')
          parts[1] = 'idle'
          this.play(parts.join('_'), true)
          this.setVelocity(0, 0)
        }
        break

      case PlayerState.SITTING:
        // back to idle if player press E while sitting
        if (Phaser.Input.Keyboard.JustDown(keyE)) {
          const parts = this.anims.currentAnim.key.split('_')
          parts[1] = 'idle'
          this.play(parts.join('_'), true)
          this._playerState = PlayerState.IDLE
        }
        break
    }
  }
}

Phaser.GameObjects.GameObjectFactory.register(
  'player',
  function (
    this: Phaser.GameObjects.GameObjectFactory,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    var sprite = new Player(this.scene, x, y, texture, frame)

    this.displayList.add(sprite)
    this.updateList.add(sprite)

    this.scene.physics.world.enableBody(sprite, Phaser.Physics.Arcade.DYNAMIC_BODY)

    const collisionScale = [0.5, 0.2]
    sprite.body
      .setSize(sprite.width * collisionScale[0], sprite.height * collisionScale[1])
      .setOffset(
        sprite.width * (1 - collisionScale[0]) * 0.5,
        sprite.height * (1 - collisionScale[1])
      )

    return sprite
  }
)
