<<<<<<< HEAD
(() => {
  // <stdin>
  var tagsToReplace = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "\u2026": "&hellip;"
  };
  function replaceTag(tag) {
    return tagsToReplace[tag] || tag;
  }
  function replaceHTMLEnt(str) {
    return str.replace(/[&<>"]/g, replaceTag);
  }
  function escapeRegExp(string) {
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&");
  }
  var Search = class _Search {
    data;
    form;
    input;
    list;
    resultTitle;
    resultTitleTemplate;
    constructor({ form, input, list, resultTitle, resultTitleTemplate }) {
      this.form = form;
      this.input = input;
      this.list = list;
      this.resultTitle = resultTitle;
      this.resultTitleTemplate = resultTitleTemplate;
      if (this.input.value.trim() !== "") {
        this.doSearch(this.input.value.split(" "));
      } else {
        this.handleQueryString();
      }
      this.bindQueryStringChange();
      this.bindSearchForm();
    }
    /**
     * Processes search matches
     * @param str original text
     * @param matches array of matches
     * @param ellipsis whether to add ellipsis to the end of each match
     * @param charLimit max length of preview string
     * @param offset how many characters before and after the match to include in preview
     * @returns preview string
     */
    static processMatches(str, matches, ellipsis = true, charLimit = 140, offset = 20) {
      matches.sort((a, b) => {
        return a.start - b.start;
      });
      let i = 0, lastIndex = 0, charCount = 0;
      const resultArray = [];
      while (i < matches.length) {
        const item = matches[i];
        if (ellipsis && item.start - offset > lastIndex) {
          resultArray.push(`${replaceHTMLEnt(str.substring(lastIndex, lastIndex + offset))} [...] `);
          resultArray.push(`${replaceHTMLEnt(str.substring(item.start - offset, item.start))}`);
          charCount += offset * 2;
        } else {
          resultArray.push(replaceHTMLEnt(str.substring(lastIndex, item.start)));
          charCount += item.start - lastIndex;
        }
        let j = i + 1, end = item.end;
        while (j < matches.length && matches[j].start <= end) {
          end = Math.max(matches[j].end, end);
          ++j;
        }
        resultArray.push(`<mark>${replaceHTMLEnt(str.substring(item.start, end))}</mark>`);
        charCount += end - item.start;
        i = j;
        lastIndex = end;
        if (ellipsis && charCount > charLimit) break;
      }
      if (lastIndex < str.length) {
        let end = str.length;
        if (ellipsis) end = Math.min(end, lastIndex + offset);
        resultArray.push(`${replaceHTMLEnt(str.substring(lastIndex, end))}`);
        if (ellipsis && end != str.length) {
          resultArray.push(` [...]`);
        }
      }
      return resultArray.join("");
    }
    async searchKeywords(keywords) {
      const rawData = await this.getData();
      const results = [];
      const regex = new RegExp(keywords.filter((v, index, arr) => {
        arr[index] = escapeRegExp(v);
        return v.trim() !== "";
      }).join("|"), "gi");
      for (const item of rawData) {
        const titleMatches = [], contentMatches = [];
        let result = {
          ...item,
          preview: "",
          matchCount: 0
        };
        const contentMatchAll = item.content.matchAll(regex);
        for (const match of Array.from(contentMatchAll)) {
          contentMatches.push({
            start: match.index,
            end: match.index + match[0].length
          });
        }
        const titleMatchAll = item.title.matchAll(regex);
        for (const match of Array.from(titleMatchAll)) {
          titleMatches.push({
            start: match.index,
            end: match.index + match[0].length
          });
        }
        if (titleMatches.length > 0) result.title = _Search.processMatches(result.title, titleMatches, false);
        if (contentMatches.length > 0) {
          result.preview = _Search.processMatches(result.content, contentMatches);
        } else {
          result.preview = replaceHTMLEnt(result.content.substring(0, 140));
        }
        result.matchCount = titleMatches.length + contentMatches.length;
        if (result.matchCount > 0) results.push(result);
      }
      return results.sort((a, b) => {
        return b.matchCount - a.matchCount;
      });
    }
    async doSearch(keywords) {
      const startTime = performance.now();
      const results = await this.searchKeywords(keywords);
      this.clear();
      for (const item of results) {
        this.list.append(_Search.render(item));
      }
      const endTime = performance.now();
      this.resultTitle.innerText = this.generateResultTitle(results.length, ((endTime - startTime) / 1e3).toPrecision(1));
    }
    generateResultTitle(resultLen, time) {
      return this.resultTitleTemplate.replace("#PAGES_COUNT", resultLen).replace("#TIME_SECONDS", time);
    }
    async getData() {
      if (!this.data) {
        const jsonURL = this.form.dataset.json;
        this.data = await fetch(jsonURL).then((res) => res.json());
        const parser = new DOMParser();
        for (const item of this.data) {
          item.content = parser.parseFromString(item.content, "text/html").body.innerText;
        }
      }
      return this.data;
    }
    bindSearchForm() {
      let lastSearch = "";
      const eventHandler = (e) => {
        e.preventDefault();
        const keywords = this.input.value.trim();
        _Search.updateQueryString(keywords, true);
        if (keywords === "") {
          lastSearch = "";
          return this.clear();
        }
        if (lastSearch === keywords) return;
        lastSearch = keywords;
        this.doSearch(keywords.split(" "));
      };
      this.input.addEventListener("input", eventHandler);
      this.input.addEventListener("compositionend", eventHandler);
    }
    clear() {
      this.list.innerHTML = "";
      this.resultTitle.innerText = "";
    }
    bindQueryStringChange() {
      window.addEventListener("popstate", (e) => {
        this.handleQueryString();
      });
    }
    handleQueryString() {
      const pageURL = new URL(window.location.toString());
      const keywords = pageURL.searchParams.get("keyword");
      this.input.value = keywords;
      if (keywords) {
        this.doSearch(keywords.split(" "));
      } else {
        this.clear();
      }
    }
    static updateQueryString(keywords, replaceState = false) {
      const pageURL = new URL(window.location.toString());
      if (keywords === "") {
        pageURL.searchParams.delete("keyword");
      } else {
        pageURL.searchParams.set("keyword", keywords);
      }
      if (replaceState) {
        window.history.replaceState("", "", pageURL.toString());
      } else {
        window.history.pushState("", "", pageURL.toString());
      }
    }
    static render(item) {
      return /* @__PURE__ */ createElement("article", null, /* @__PURE__ */ createElement("a", { href: item.permalink }, /* @__PURE__ */ createElement("div", { class: "article-details" }, /* @__PURE__ */ createElement("h2", { class: "article-title", dangerouslySetInnerHTML: { __html: item.title } }), /* @__PURE__ */ createElement("section", { class: "article-preview", dangerouslySetInnerHTML: { __html: item.preview } })), item.image && /* @__PURE__ */ createElement("div", { class: "article-image" }, /* @__PURE__ */ createElement("img", { src: item.image, loading: "lazy" }))));
    }
  };
  window.addEventListener("load", () => {
    setTimeout(function() {
      const searchForm = document.querySelector(".search-form"), searchInput = searchForm.querySelector("input"), searchResultList = document.querySelector(".search-result--list"), searchResultTitle = document.querySelector(".search-result--title");
      new Search({
        form: searchForm,
        input: searchInput,
        list: searchResultList,
        resultTitle: searchResultTitle,
        resultTitleTemplate: window.searchResultTitleTemplate
      });
    }, 0);
  });
  var stdin_default = Search;
})();
=======
(()=>{var m={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","\u2026":"&hellip;"};function T(l){return m[l]||l}function d(l){return l.replace(/[&<>"]/g,T)}function f(l){return l.replace(/[.*+\-?^${}()|[\]\\]/g,"\\$&")}var g=class l{data;form;input;list;resultTitle;resultTitleTemplate;constructor({form:t,input:e,list:r,resultTitle:o,resultTitleTemplate:n}){this.form=t,this.input=e,this.list=r,this.resultTitle=o,this.resultTitleTemplate=n,this.input.value.trim()!==""?this.doSearch(this.input.value.split(" ")):this.handleQueryString(),this.bindQueryStringChange(),this.bindSearchForm()}static processMatches(t,e,r=!0,o=140,n=20){e.sort((i,s)=>i.start-s.start);let h=0,a=0,c=0,u=[];for(;h<e.length;){let i=e[h];r&&i.start-n>a?(u.push(`${d(t.substring(a,a+n))} [...] `),u.push(`${d(t.substring(i.start-n,i.start))}`),c+=n*2):(u.push(d(t.substring(a,i.start))),c+=i.start-a);let s=h+1,p=i.end;for(;s<e.length&&e[s].start<=p;)p=Math.max(e[s].end,p),++s;if(u.push(`<mark>${d(t.substring(i.start,p))}</mark>`),c+=p-i.start,h=s,a=p,r&&c>o)break}if(a<t.length){let i=t.length;r&&(i=Math.min(i,a+n)),u.push(`${d(t.substring(a,i))}`),r&&i!=t.length&&u.push(" [...]")}return u.join("")}async searchKeywords(t){let e=await this.getData(),r=[],o=new RegExp(t.filter((n,h,a)=>(a[h]=f(n),n.trim()!=="")).join("|"),"gi");for(let n of e){let h=[],a=[],c={...n,preview:"",matchCount:0},u=n.content.matchAll(o);for(let s of Array.from(u))a.push({start:s.index,end:s.index+s[0].length});let i=n.title.matchAll(o);for(let s of Array.from(i))h.push({start:s.index,end:s.index+s[0].length});h.length>0&&(c.title=l.processMatches(c.title,h,!1)),a.length>0?c.preview=l.processMatches(c.content,a):c.preview=d(c.content.substring(0,140)),c.matchCount=h.length+a.length,c.matchCount>0&&r.push(c)}return r.sort((n,h)=>h.matchCount-n.matchCount)}async doSearch(t){let e=performance.now(),r=await this.searchKeywords(t);this.clear();for(let n of r)this.list.append(l.render(n));let o=performance.now();this.resultTitle.innerText=this.generateResultTitle(r.length,((o-e)/1e3).toPrecision(1))}generateResultTitle(t,e){return this.resultTitleTemplate.replace("#PAGES_COUNT",t).replace("#TIME_SECONDS",e)}async getData(){if(!this.data){let t=this.form.dataset.json;this.data=await fetch(t).then(r=>r.json());let e=new DOMParser;for(let r of this.data)r.content=e.parseFromString(r.content,"text/html").body.innerText}return this.data}bindSearchForm(){let t="",e=r=>{r.preventDefault();let o=this.input.value.trim();if(l.updateQueryString(o,!0),o==="")return t="",this.clear();t!==o&&(t=o,this.doSearch(o.split(" ")))};this.input.addEventListener("input",e),this.input.addEventListener("compositionend",e)}clear(){this.list.innerHTML="",this.resultTitle.innerText=""}bindQueryStringChange(){window.addEventListener("popstate",t=>{this.handleQueryString()})}handleQueryString(){let e=new URL(window.location.toString()).searchParams.get("keyword");this.input.value=e,e?this.doSearch(e.split(" ")):this.clear()}static updateQueryString(t,e=!1){let r=new URL(window.location.toString());t===""?r.searchParams.delete("keyword"):r.searchParams.set("keyword",t),e?window.history.replaceState("","",r.toString()):window.history.pushState("","",r.toString())}static render(t){return createElement("article",null,createElement("a",{href:t.permalink},createElement("div",{class:"article-details"},createElement("h2",{class:"article-title",dangerouslySetInnerHTML:{__html:t.title}}),createElement("section",{class:"article-preview",dangerouslySetInnerHTML:{__html:t.preview}})),t.image&&createElement("div",{class:"article-image"},createElement("img",{src:t.image,loading:"lazy"}))))}};window.addEventListener("load",()=>{setTimeout(function(){let l=document.querySelector(".search-form"),t=l.querySelector("input"),e=document.querySelector(".search-result--list"),r=document.querySelector(".search-result--title");new g({form:l,input:t,list:e,resultTitle:r,resultTitleTemplate:window.searchResultTitleTemplate})},0)});var w=g;})();
>>>>>>> 6f52f6d7b0f316cfbdb12c5eaf679fbb914a7446
