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

    addDomainToMedias()
    wrapCodeBlocks()
  }

  // Get a potential candidate for a front matter.
  function getFrontMatter(md) {
    const end = findFrontMatterEnd(md)

    const frontMatter = md.substring(0, end).trim()
    const rest = md.substring(end).trim()

    return {frontMatter, rest}
  }

  function findFrontMatterEnd(md) {
    // This is dirty, but we have no other way to detect the end of a front matter.
    // I always use '---' to close the front matter block,
    //
    // And this is translated by iA Writer as a `---</p>` or `<h2>` tag in most cases.
    const END_PARA = '---</p>'
    const END_H2 = '</h2>'

    // First and rarest case: we find a ---</p>.
    const endWithPara = md.indexOf(END_PARA)
    if (endWithPara !== -1) {
      return endWithPara + END_PARA.length
    }

    // Otherwise, it's probably an </h2>.
    return md.indexOf(END_H2) + END_H2.length
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
    // A tag can contain multiple metadata (if there's no newline between them).
    // So, first, we split each node's content into multiple lines.
    const items = getNodes(frontMatter).reduce((acc, x) => {
      if (x.nodeType === Node.ELEMENT_NODE && x.textContent.trim() !== '') {
        const lines = x.textContent.split('\n')

        acc = [...acc, ...lines]
      }

      return acc
    }, [])

    // Then, for each line, we extract the actual metadata.
    // It won't work for nested yaml data however.
    return items.reduce((acc, x) => {
      const [key, value] = x.split(':')

      if (key && value) {
        // Trim and remove first and last quotation marks from the value.
        acc[key.trim().toLowerCase()] = value.trim().replace(/^"|"$/g, '')
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

  // Find relative URLs in images/videos and add the root domain.
  function addDomainToMedias() {
    document.querySelectorAll('img, video').forEach(x => {
      const url = x.getAttribute('src')
      if (url && url.startsWith('/')) {
        x.setAttribute('src', 'https://matthieuoger.com' + url)
      }
    })
  }

  // Wrap pre>code element with a div to fix styles.
  function wrapCodeBlocks() {
    document.querySelectorAll('pre > code').forEach(codeNode => {
      const wrapper = document.createElement('div')
      wrapper.setAttribute('class', 'gatsby-highlight')

      const language = 'language-' + codeNode.getAttribute('class')

      // Move up two levels (first, go to pre, then go the actual parent)
      const preNode = codeNode.parentNode
      preNode.setAttribute('class', language)

      // Get actual container.
      const container = preNode.parentNode

      // Insert at the right position (which is why we need to do it in 2 steps).
      container.insertBefore(wrapper, preNode)
      wrapper.appendChild(preNode)
    })
  }

  function identity(x) {
    return x
  }
})()
