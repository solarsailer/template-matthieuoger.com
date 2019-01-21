'use strict'
;(function() {
  window.addEventListener('load', () => {
    const container = document.querySelector('[data-document]')
    process(container)

    container.addEventListener('ia-writer-change', () => {
      process(container)
    })
  })

  // This is a big hack to clean an iA Writer document.
  //
  // - Find a remove a front matter.
  // - Extract metadata.
  // - Bind metadata.
  // - Clean the document.
  function process(container) {
    const md = container.innerHTML
    const {frontMatter, rest} = getFrontMatter(md)
    stripFrontMatter(container, frontMatter, rest)

    const metadata = extractMetadata(frontMatter)
    bindMetadata(metadata)

    changeVisibility('.post-header')
    changeVisibility('.post-footer')
  }

  // Get a potential candidate for a front matter.
  function getFrontMatter(md) {
    // This is dirty, but we have no other way to detect the end of a front matter.
    // I always use '---' to close the front matter block,
    // and this is translated by iA Writer as an <h2> tag.
    const FRONT_MATTER_END = '</h2>'
    const end = md.indexOf(FRONT_MATTER_END) + FRONT_MATTER_END.length

    const frontMatter = md.substring(0, end).trim()
    const rest = md.substring(end).trim()

    return {frontMatter, rest}
  }

  // Remove a front matter.
  function stripFrontMatter(container, frontMatter, rest) {
    if (isFrontMatter(frontMatter)) {
      container.innerHTML = rest
    }
  }

  // Determine if the passed object is an actual front matter.
  //
  // To be sure that we have detected a front matter,
  // we will check each line if there's a colon.
  //
  // This might return false-positive and could be improved.
  // Good enough as it is.
  function isFrontMatter(frontMatter) {
    return getNodes(frontMatter)
      .map((x, i) => {
        // The first node must be an <hr> node.
        if (i === 0) {
          if (x.nodeName.toLowerCase() === 'hr') return true
        } else {
          // Text nodes are accepted (newlines).
          if (x.nodeType === Node.TEXT_NODE) return true

          // Other nodes:
          // We get the text, split it to see if there's a key/value pair.
          //
          // If the yaml has an higher depth, we don't care.
          // As long as we find one key/value, it's enough for us.
          const subtexts = x.textContent.split(':')
          if (subtexts.length >= 2) return true
        }

        return false
      })
      .every(identity)
  }

  // Find metadata in a potential front matter.
  function extractMetadata(frontMatter) {
    return getNodes(frontMatter).reduce((acc, x) => {
      if (x.nodeType === Node.ELEMENT_NODE) {
        const [key, value] = x.textContent.split(':')

        if (key && value) {
          // Trim and remove first and last quotation marks from the value.
          acc[key.trim().toLowerCase()] = value.trim().replace(/^"|"$/g, '')
        }
      }

      return acc
    }, {})
  }

  // Find a node with the corresponding data value and add a data to it.
  function bindMetadata(metadata) {
    Object.entries(metadata).forEach(([key, value]) => {
      const elements = document.querySelectorAll(`[data-meta-${key}]`)
      elements.forEach(x => (x.textContent = value))
    })
  }

  // Remove a node if it's empty.
  function changeVisibility(cssSelector) {
    document.querySelectorAll(cssSelector).forEach(x => {
      if (x.nodeType === Node.ELEMENT_NODE && x.textContent.trim() === '') {
        x.style.display = 'none'
      } else {
        x.style.display = null
      }
    })
  }

  // Convert a text into a node and return its children as an array.
  function getNodes(text) {
    var el = document.createElement('div')
    el.innerHTML = text.trim()

    return Array.from(el.childNodes)
  }

  function identity(x) {
    return x
  }
})()
