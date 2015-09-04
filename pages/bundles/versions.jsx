var pagename = getPagenameFromHash()

var VersionsApp = React.createClass({
  getInitialState: function () {
    return { bundles: [], error: null }
  },

  getRevs: function (id, opts, cb) {
    pull(
      ssb.bundles.listRevisions(id, opts),
      pull.collect(cb.bind(this))
    )
  },

  componentDidMount: function () {
    // lookup the current default bundle
    ssb.bundles.lookup(pagename, (function (err, defaultBundleId) {
      // get the toplevel bundles at this page
      this.getRevs(pagename, { root: null }, function (err, bundles) {
        if (err) {
          console.error(err)
          this.setState({ error: err })
        } else {
          // load the revisions of each toplevel
          var self = this
          this.setState({ bundles: bundles.map(function (b) {
            var rootBundle = {
              id: b.id,
              name: b.name,
              desc: b.desc,
              author: b.author,
              blobs: b.blobs,
              history: [b],
              isShowingHistory: true
            }
            self.getRevs(b.id, null, function (err, bundles) {
              if (err) {
                console.error(err)
                self.setState({ error: err })
              } else {
                rootBundle.history = rootBundle.history.concat(bundles)
                rootBundle.history.forEach(function (b) {
                  b.isDefault = (b.id == defaultBundleId)
                })
                rootBundle.history.sort(function (a, b) {
                  // put working copies on top
                  if (!a.blobs) return -1
                  if (!b.blobs) return 1
                  // sort by ts
                  return b.timestamp - a.timestamp
                })
                self.setState(self.state)
              }
            })
            return rootBundle
          })})
        }
      })
    }).bind(this))
  },

  onToggleHistory: function (bundle) {
    bundle.isShowingHistory = !bundle.isShowingHistory
    this.setState(this.state)
  },

  onMakeDefault: function (bundle) {
    console.log(bundle)
    ssb.bundles.setForkAsDefault(bundle.id, (function (err) {
      if (err) {
        console.error(err)
        this.setState({ error: err })
      } else {
        // update isDefault state
        this.state.bundles.forEach(function (b) {
          b.history.forEach(function (b2) {
            b2.isDefault = (b2.id == bundle.id)
          })
        })
        this.setState(this.state)
      }
    }).bind(this))
  },

  onRemoveWorking: function (bundle) {
    if (!confirm('Remove this working copy?'))
      return

    ssb.bundles.removeWorking(bundle.id, (function (err) {
      if (err) {
        console.error(err)
        this.setState({ error: err })
      } else {
        // remove the bundle from state
        this.state.bundles = this.state.bundles.filter(function (b) {
          b.history = b.history.filter(function (b2) {
            return (b2.id != bundle.id)
          })
          return b.history.length > 0
        })
        this.setState(this.state)

      }
    }).bind(this))
  },

  render: function () {
    var self = this
    return <div>
      <h1><a href={pagename}>{pagename}</a></h1>
      <p><a className="action" href={'/bundles/new.html#'+pagename}>start a new version</a></p>
      {this.state.error ? <pre>{this.state.error.stack}</pre> : undefined}
      {!this.state.error && this.state.bundles.length === 0 ? <p>Nothing has been published yet. Guess you need to make a version!</p> : undefined}
      {this.state.bundles.map(function (b, i) {
        return <BundleListing key={'bundle-'+i} bundle={b} isTop={true} onToggleHistory={self.onToggleHistory} onMakeDefault={self.onMakeDefault} onRemoveWorking={self.onRemoveWorking} />
      })}
    </div>
  }
})

React.render(
  <VersionsApp />,
  document.getElementById('content')
)