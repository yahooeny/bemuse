
import './MusicSelectScene.scss'

import React            from 'react'
import ReactDOM         from 'react-dom'
import c                from 'classnames'
import $                from 'jquery'
import pure             from 'recompose/pure'
import compose          from 'recompose/compose'

import { connect }      from 'bemuse/flux'
import SCENE_MANAGER    from 'bemuse/scene-manager'
import online           from 'bemuse/online/instance'
import Scene            from 'bemuse/ui/Scene'
import SceneHeading     from 'bemuse/ui/SceneHeading'
import SceneToolbar     from 'bemuse/ui/SceneToolbar'
import ModalPopup       from 'bemuse/ui/ModalPopup'

import AuthenticationPopup from 'bemuse/online/ui/AuthenticationPopup'

import UnofficialPanel  from './UnofficialPanel'
import MusicList        from './MusicList'
import MusicInfo        from './MusicInfo'
import Options          from './Options'
import CustomBMS        from './CustomBMS'
import Store            from '../stores/music-select-store'
import * as Actions     from '../actions/music-select-actions'
import * as Analytics   from '../analytics'

import * as CustomBMSActions from '../actions/custom-bms-actions'
import { shouldShowOptions } from 'bemuse/devtools/query-flags'

export const MusicSelectScene = React.createClass({
  render () {
    let musicSelect = this.props.musicSelect
    return <Scene className="MusicSelectScene">
      <SceneHeading>
        Select Music
        <input
          type="text"
          placeholder="Filter…"
          className="MusicSelectSceneのsearch"
          onChange={this.handleFilter}
          value={musicSelect.filterText}
        />
      </SceneHeading>

      {this.renderUnofficialDisclaimer()}

      {this.renderMain()}

      <SceneToolbar>
        <a onClick={this.popScene} href="javascript://">Exit</a>
        <a
          onClick={this.handleCustomBMSOpen}
          href="javascript://"
          onDragEnter={this.handleCustomBMSOpen}
        >
          Play Custom BMS
        </a>
        <SceneToolbar.Spacer />
        {this.renderOnlineToolbarButtons()}
        <a onClick={this.handleOptionsOpen} href="javascript://">Options</a>
      </SceneToolbar>

      <ModalPopup
        visible={this.state.optionsVisible}
        onBackdropClick={this.handleOptionsClose}
      >
        <Options onClose={this.handleOptionsClose} />
      </ModalPopup>

      <ModalPopup
        visible={this.state.customBMSVisible}
        onBackdropClick={this.handleCustomBMSClose}
      >
        <div className="MusicSelectSceneのcustomBms">
          <CustomBMS onSongLoaded={this.handleCustomSong} />
        </div>
      </ModalPopup>

      <ModalPopup
        visible={this.state.unofficialDisclaimerVisible}
        onBackdropClick={this.handleUnofficialClose}
      >
        <UnofficialPanel onClose={this.handleUnofficialClose} />
      </ModalPopup>

      <AuthenticationPopup
        visible={this.state.authenticationPopupVisible}
        onFinish={this.handleAuthenticationFinish}
        onBackdropClick={this.handleAuthenticationClose}
      />
    </Scene>
  },
  renderUnofficialDisclaimer () {
    if (!this.props.musicSelect.unofficial) return null
    return (
      <div
        className="MusicSelectSceneのunofficialLabel"
        onClick={this.handleUnofficialClick}
      >
        <b>Disclaimer:</b> Unofficial Server
      </div>
    )
  },
  renderMain () {
    const musicSelect = this.props.musicSelect
    if (musicSelect.loading) {
      return <div className="MusicSelectSceneのloading">Loading…</div>
    }
    if (musicSelect.error) {
      return <div className="MusicSelectSceneのloading">Cannot load collection!</div>
    }
    if (musicSelect.songs.length === 0) {
      return <div className="MusicSelectSceneのloading">No songs found!</div>
    }
    return (
      <div
        className={c('MusicSelectSceneのmain', { 'is-in-song': this.state.inSong })}
      >
        <MusicList
          groups={musicSelect.groups}
          highlight={musicSelect.highlight}
          selectedSong={musicSelect.song}
          selectedChart={musicSelect.chart}
          playMode={musicSelect.playMode}
          onSelect={this.handleSongSelect}
          onTouch={this.handleMusicListTouch}
        />
        <MusicInfo
          song={musicSelect.song}
          chart={musicSelect.chart}
          charts={musicSelect.charts}
          playMode={musicSelect.playMode}
          onChartClick={this.handleChartClick}
          onOptions={this.handleOptionsOpen}
        />
      </div>
    )
  },
  renderOnlineToolbarButtons () {
    if (!online) return null
    let buttons = []
    if (this.props.user) {
      buttons.push(
        <a onClick={this.handleLogout} href="javascript://online/logout" key="logout">
          Log Out
          ({this.props.user.username})
        </a>
      )
    } else {
      buttons.push(
        <a onClick={this.handleAuthenticate} href="javascript://online/logout" key="auth">
          Log In / Create an Account
        </a>
      )
    }
    return buttons
  },

  getInitialState () {
    return {
      optionsVisible:               shouldShowOptions(),
      customBMSVisible:             false,
      unofficialDisclaimerVisible:  false,
      inSong:                       false,
      authenticationPopupVisible:   false,
    }
  },
  componentDidMount () {
    this.ensureSelectedSongInView()
  },
  ensureSelectedSongInView () {
    const $this = $(ReactDOM.findDOMNode(this))
    const active = $this.find('.js-active-song')[0]
    if (!active) return
    const scroller = $(active).closest('.js-scrollable-view')[0]
    if (!scroller) return
    const scrollerRect = scroller.getBoundingClientRect()
    const activeRect = active.getBoundingClientRect()
    if (activeRect.bottom > scrollerRect.bottom || activeRect.top < scrollerRect.top) {
      scroller.scrollTop += (
        (activeRect.top + activeRect.height / 2) -
        (scrollerRect.top + scrollerRect.height / 2)
      )
    }
  },
  handleSongSelect (song, chart) {
    Actions.selectSong(song)
    if (chart) {
      Actions.selectChart(chart)
      Analytics.action('MusicSelectScene:selectSongAndChart')
    } else {
      Analytics.action('MusicSelectScene:selectSong')
    }
    this.setState({ inSong: true })
  },
  handleMusicListTouch () {
    this.setState({ inSong: false })
  },
  handleChartClick (chart) {
    if (this.props.musicSelect.chart.md5 === chart.md5) {
      Analytics.action('MusicSelectScene:launchGame')
      Actions.launchGame()
    } else {
      Analytics.action('MusicSelectScene:selectChart')
      Actions.selectChart(chart)
    }
  },
  handleFilter (e) {
    Actions.setFilterText(e.target.value)
  },
  handleOptionsOpen () {
    Analytics.action('MusicSelectScene:optionsOpen')
    this.setState({ optionsVisible: true })
  },
  handleOptionsClose () {
    this.setState({ optionsVisible: false })
  },
  handleCustomBMSOpen () {
    CustomBMSActions.clear()
    this.setState({ customBMSVisible: true })
    Analytics.action('MusicSelectScene:customBMSOpen')
  },
  handleCustomBMSClose () {
    this.setState({ customBMSVisible: false })
  },
  handleCustomSong (song) {
    Actions.setCustomSong(song)
    this.setState({ customBMSVisible: false })
  },
  handleUnofficialClick () {
    this.setState({ unofficialDisclaimerVisible: true })
    Analytics.action('MusicSelectScene:unofficialClick')
  },
  handleUnofficialClose () {
    this.setState({ unofficialDisclaimerVisible: false })
  },
  handleLogout () {
    if (confirm('Do you really want to log out?')) {
      Promise.resolve(online.logOut()).done()
      Analytics.action('MusicSelectScene:logout')
    }
  },
  handleAuthenticate () {
    this.setState({ authenticationPopupVisible: true })
    Analytics.action('MusicSelectScene:authenticate')
  },
  handleAuthenticationClose () {
    this.setState({ authenticationPopupVisible: false })
  },
  handleAuthenticationFinish () {
    this.setState({ authenticationPopupVisible: false })
  },
  popScene () {
    SCENE_MANAGER.pop().done()
  },

})

export default compose(
  connect({ musicSelect: Store, user: online && online.user川 }),
  pure
)(MusicSelectScene)
