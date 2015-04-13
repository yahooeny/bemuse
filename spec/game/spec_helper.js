
import BMS        from 'bms'
import Notechart  from 'bemuse/game/notechart'
import Player     from 'bemuse/game/player'
import R          from 'ramda'

export let tap = R.tap

export function chart(code='') {
  return BMS.Compiler.compile(code).chart
}

export function notechart(code) {
  return Notechart.fromBMSChart(chart(code))
}

export function playerWithBMS(code, options={}) {
  return new Player(notechart(code), 1, options)
}
