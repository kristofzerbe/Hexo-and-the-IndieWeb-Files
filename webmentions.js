/**
 * Method to retreive Webmentions from webmention.io and insert them into a article page
 * see: https://kiko.io/categories/Tools/Hexo-and-the-IndieWeb-Receiving-Webmentions/
 * @param {string} key - slug of the article 
 */
function insertWebmentions(key) {
  
  const dtf = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'long', day: '2-digit' });
  const lsTimestamp = "wmts_" + key;
  const lsWebmentions = "wm_" + key;

  const currentUrl = window.location.href;
  const wmUrl = `https://webmention.io/api/mentions.jf2?target=${currentUrl}&per-page=100&sort-dir=up`;

  let lastRequest;
  let webmentions;

  // Get data from browser storage, if available
  if (localStorage.getItem(lsTimestamp) && 
    localStorage.getItem(lsWebmentions)) {

    lastRequest = localStorage.getItem(lsTimestamp);
    webmentions = JSON.parse(localStorage.getItem(lsWebmentions));
  }

  if(webmentions && lastRequest && Math.abs(Date.now() - lastRequest) / (60*60*1000) < 1) {
    // Webmentions are present and not older than an hour
    process();
  } else {
    // Get Webmentions from webmention.io
    load().then(() => { process(); });
  };

  /**
   * Load webmention.io's JSON data for the current page
   */
  async function load() {
    const response = await fetch(wmUrl);
    webmentions = await response.json();
    localStorage.setItem(lsWebmentions, JSON.stringify(webmentions));
    localStorage.setItem(lsTimestamp, Date.now());
  }

  /**
   * Process Webmentions
   */
  function process() {
    const placeholder = document.querySelector(".webmentions-placeholder");
    
    if (webmentions.children.length > 0) {
      placeholder.innerHTML = "";

      let runningNo = 0;

      webmentions.children.forEach(entry => {
        runningNo += 1;
        entry.no = runningNo;

        let item;
        switch (entry["wm-property"]) {
          case "mention-of":  item = getMention(entry); break;
          case "in-reply-to": item = getReply(entry); break;
          case "like-of":     item = getLike(entry); break;
          case "repost-of":   item = getRepost(entry); break;
          case "bookmark-of": item = getBookmark(entry); break;
          default: break;
        }
        placeholder.insertAdjacentElement("beforeend", item);
      });
    }

  }

  /**
   * Extend author for element
   * @param {Webmention} wm 
   */
  function extendAuthor(wm) {

    wm.author.card_class = "h_card";
    wm.author.name_class = "p-name";
    wm.author.photo_class = "u-photo";
    wm.author.url_class = "u-url";
    
    if (!wm.author.name) {
      wm.author.name = "Somebody";
      wm.author.card_class = "";
      wm.author.name_class = "";
    }

    if (!wm.author.photo) {
      wm.author.photo = 
        "https://avatars.dicebear.com/api/identicon/" + 
        Math.random().toString(36).substring(3) + ".svg" + 
        "?width=44&margin=5&colors=grey&colorLevel=400";
      wm.author.photo_class = "";
    }
    
    if (!wm.author.url) {
      wm.author.url = "javascript:void();";
      wm.author.url_class = "";
    }

  }

  /**
   * Get Wrapper from template
   * @param {Webmention} wm 
   * @param {string} verb 
   * @returns 
   */
  function getWrapper(wm, verb) {
    let wrapper = createElementFromHtml(`
      <div class="webmention wm-${verb}" id="wm-${wm['wm-id']}">
      </div>
    `);

    wrapper.insertAdjacentElement("beforeend", getHeader(wm, verb))
    return wrapper;
  }

  /**
   * Get Header part from template
   * @param {Webmention} wm 
   * @param {string} verb 
   * @returns 
   */
  function getHeader(wm, verb) {
    extendAuthor(wm);

    let e = createElementFromHtml(`
      <div class="wm-card ${wm.author.card_class}">
        <a class="wm-photo-link ${wm.author.url_class}" href="${wm.author.url}">
          <img class="wm-photo ${wm.author.photo_class}" width="44" height="44"
               src="${wm.author.photo}" alt="${wm.author.name}" />
        </a>
        <div class="wm-meta">
          <a class="wm-name ${wm.author.name_class}" href="${wm.author.url}">${wm.author.name}</a>
          <span class="wm-verb">${verb} on</span>
          <time class="wm-date dt-published" datetime="${wm['wm-received']}">${dtf.format(Date.parse(wm['wm-received']))}</time>
          <small>${wm.no}</small>
        </div>
      </div>
    `);

    return e;
  }

  /**
   * Get Mention
   * @param {Webmention} wm 
   * @returns {Element}
   */
  function getMention(wm) {
    let wrapper = getWrapper(wm, "mentioned");
    
    let text = "";
    if (wm.content && wm.content.text) {
      text = `<p>${getWords(wm.content.text, 50)}</p>`
    }

    let content = `
      <div class="wm-content p-content">
        ${text}
        <a class="wm-source" href="${wm['wm-source']}">${wm['wm-source']}</a>
      </div>
    `;
    wrapper.insertAdjacentHTML("beforeend", content)    
    return wrapper;
  }

  /**
   * Get Reply
   * @param {Webmention} wm 
   * @returns {Element}
   */
  function getReply(wm) {
    let wrapper = getWrapper(wm, "replied");
    
    let content = `
      <div class="wm-content p-content">
        <p>${wm.content.html}</p>
      </div>
    `;
    wrapper.insertAdjacentHTML("beforeend", content)    
    return wrapper;  }

  /**
   * Get Like
   * @param {Webmention} wm 
   * @returns {Element}
   */
   function getLike(wm) {
    return getWrapper(wm, "liked");
  }

  /**
   * Get Repost
   * @param {Webmention} wm 
   * @returns {Element}
   */
  function getRepost(wm) {
    let wrapper = getWrapper(wm, "reposted");
    
    let content = `
      <div class="wm-content p-content">
        <p>... at <a href="${wm['wm-source']}">${wm['wm-source']}</a></p>
      </div>
    `;
    wrapper.insertAdjacentHTML("beforeend", content)    
    return wrapper;
  }

  /**
   * Get Bookmark
   * @param {Webmention} wm 
   * @returns {Element}
   */
  function getBookmark(wm) {
    return getWrapper(wm, "bookmarked");
  }

  /**
   * Converts HTML into element
   * @param {string} html 
   * @returns {Element}
   */
  function createElementFromHtml(html) {
    let e = document.createElement("template");
    e.innerHTML = html.trim();
    return e.content.firstChild;
  }

  /**
   * Get first n words
   * @param {string} str 
   * @param {int} wordLimit 
   * @returns {string}
   */
  function getWords(str, wordLimit) {
    let words = str.split(/\s+/);
    let ret = words.slice(0, wordLimit).join(" ");
    if (words.length > wordLimit) {
      ret += " ...";
    }
    return ret;
  }

}
