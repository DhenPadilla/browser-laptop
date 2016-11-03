/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const Immutable = require('immutable')
const {makeImmutable} = require('./immutableUtil')
const siteUtil = require('../../../js/state/siteUtil')

const excludeSiteDetail = (siteDetail) => {
  return !siteUtil.isBookmark(siteDetail) && !siteUtil.isHistoryEntry(siteDetail)
}

const removeDuplicateSites = (sites) => {
  // Filter out duplicate entries by location
  return sites.filter((element, index, list) => {
    if (!element) return false
    return index === list.findIndex((site) => site && site.get('location') === element.get('location'))
  })
}

const newTabState = {
  mergeDetails: (state, props) => {
    if (!props) {
      return state
    }

    state = state.mergeIn(['about', 'newtab'], props.newTabPageDetail)
    return state.setIn(['about', 'newtab', 'updatedStamp'], new Date().getTime())
  },

  addSite: (state, props) => {
    if (!props) {
      return state
    }

    // Add timestamp if missing (ex: this is a visit, not a bookmark)
    let siteDetail = makeImmutable(props.siteDetail)
    siteDetail = siteDetail.set('lastAccessedTime', siteDetail.get('lastAccessedTime') || new Date().getTime())

    // Only bookmarks and history items should be considered
    if (excludeSiteDetail(siteDetail)) {
      return state
    }

    // Keep track of the last 18 visited sites
    let sites = state.getIn(['about', 'newtab', 'sites']) || new Immutable.List()
    sites = sites.unshift(siteDetail)
    sites = removeDuplicateSites(sites)
    sites = sites.take(18)
    // TODO(cezaraugusto): Sort should respect unshift and don't prioritize bookmarks
    // |
    // V
    // .sort(suggestion.sortByAccessCountWithAgeDecay)
    sites = siteUtil.addSite(sites, siteDetail, props.tag, props.originalSiteDetail)
    state = state.setIn(['about', 'newtab', 'sites'], sites)
    return state.setIn(['about', 'newtab', 'updatedStamp'], new Date().getTime())
  },

  removeSite: (state, props) => {
    if (!props) {
      return state
    }

    // Only bookmarks and history items should be considered
    if (excludeSiteDetail(props.siteDetail)) {
      return state
    }

    const sites = state.getIn(['about', 'newtab', 'sites'])
    state = state.setIn(['about', 'newtab', 'sites'], siteUtil.removeSite(sites, props.siteDetail, props.tag))
    return state.setIn(['about', 'newtab', 'updatedStamp'], new Date().getTime())
  },

  updateSiteFavicon: (state, props) => {
    if (!props) {
      return state
    }

    const sites = state.getIn(['about', 'newtab', 'sites'])
    const sitesWithFavicon = siteUtil.updateSiteFavicon(sites, props.frameProps.get('location'), props.favicon)
    state = state.setIn(['about', 'newtab', 'sites'], sitesWithFavicon)
    return state.setIn(['about', 'newtab', 'updatedStamp'], new Date().getTime())
  }
}

module.exports = newTabState
