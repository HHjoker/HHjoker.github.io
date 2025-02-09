(() => {  
  var m = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "\u2026": "&hellip;",
  };
  function T(l) {
    return m[l] || l;
  }
  function d(l) {
    return l.replace(/[&<>"]/g, T);
  }
  function f(l) {
    return l.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&");
  }
  var g = class l {
    data;
    form;
    input;
    list;
    resultTitle;
    resultTitleTemplate;
    constructor({ form: t, input: e, list: r, resultTitle: o, resultTitleTemplate: n }) {
      this.form = t;
      this.input = e;
      this.list = r;
      this.resultTitle = o;
      this.resultTitleTemplate = n;
      this.input.value.trim() !== ""
        ? this.doSearch(this.input.value.split(" "))
        : this.handleQueryString();
      this.bindQueryStringChange();
      this.bindSearchForm();
    }
    static processMatches(t, e, r = !0, o = 140, n = 20) {
      e.sort((i, s) => i.start - s.start);
      let h = 0,
        a = 0,
        c = 0,
        u = [];
      for (; h < e.length; ) {
        let i = e[h];
        r && i.start - n > a
          ? (u.push(`${d(t.substring(a, a + n))} [...] `),
            u.push(`${d(t.substring(i.start - n, i.start))}`),
            c += n * 2)
          : (u.push(d(t.substring(a, i.start))), c += i.start - a);
        let s = h + 1,
          p = i.end;
        for (; s < e.length && e[s].start <= p; )
          (p = Math.max(e[s].end, p)), ++s;
        if (
          (u.push(`<mark>${d(t.substring(i.start, p))}</mark>`),
          (c += p - i.start),
          (h = s),
          (a = p),
          r && c > o)
        )
          break;
      }
      if (a < t.length) {
        let i = t.length;
        r && (i = Math.min(i, a + n)),
          u.push(`${d(t.substring(a, i))}`),
          r && i != t.length && u.push(" [...]");
      }
      return u.join("");
    }
    async searchKeywords(t) {
      let e = await this.getData(),
        r = [],
        o = new RegExp(
          t.filter((n, h, a) => ((a[h] = f(n)), n.trim() !== "")).join("|"),
          "gi"
        );
      for (let n of e) {
        let h = [],
          a = [],
          c = { ...n, preview: "", matchCount: 0 },
          u = n.content.matchAll(o);
        for (let s of Array.from(u))
          a.push({ start: s.index, end: s.index + s[0].length });
        let i = n.title.matchAll(o);
        for (let s of Array.from(i))
          h.push({ start: s.index, end: s.index + s[0].length });
        h.length > 0 && (c.title = l.processMatches(c.title, h, !1)),
          a.length > 0
            ? (c.preview = l.processMatches(c.content, a))
            : (c.preview = d(c.content.substring(0, 140))),
          (c.matchCount = h.length + a.length),
          c.matchCount > 0 && r.push(c);
      }
      return r.sort((n, h) => h.matchCount - n.matchCount);
    }
    async doSearch(t) {
      let e = performance.now(),
        r = await this.searchKeywords(t);
      this.clear();
      for (let n of r) this.list.append(l.render(n));
      let o = performance.now();
      this.resultTitle.innerText = this.generateResultTitle(
        r.length,
        ((o - e) / 1e3).toPrecision(1)
      );
    }
    generateResultTitle(t, e) {
      return this.resultTitleTemplate
        .replace("#PAGES_COUNT", t)
        .replace("#TIME_SECONDS", e);
    }
    async getData() {
      if (!this.data) {
        let t = this.form.dataset.json;
        this.data = await fetch(t).then((r) => r.json());
        let e = new DOMParser();
        for (let r of this.data)
          r.content = e.parseFromString(r.content, "text/html").body.innerText;
      }
      return this.data;
    }
    bindSearchForm() {
      let t = "",
        e = (r) => {
          r.preventDefault();
          let o = this.input.value.trim();
          if ((l.updateQueryString(o, !0), o === "")) return (t = ""), this.clear();
          t !== o && ((t = o), this.doSearch(o.split(" ")));
        };
      this.input.addEventListener("input", e),
        this.input.addEventListener("compositionend", e);
    }
    clear() {
      (this.list.innerHTML = ""), (this.resultTitle.innerText = "");
    }
    bindQueryStringChange() {
      window.addEventListener("popstate", (t) => {
        this.handleQueryString();
      });
    }
    handleQueryString() {
      let e = new URL(window.location.toString()).searchParams.get("keyword");
      (this.input.value = e), e ? this.doSearch(e.split(" ")) : this.clear();
    }
    static updateQueryString(t, e = !1) {
      let r = new URL(window.location.toString());
      t === "" ? r.searchParams.delete("keyword") : r.searchParams.set("keyword", t),
        e
          ? window.history.replaceState("", "", r.toString())
          : window.history.pushState("", "", r.toString());
    }
    static render(t) {
      return createElement(
        "article",
        null,
        createElement(
          "a",
          { href: t.permalink },
          createElement(
            "div",
            { class: "article-details" },
            createElement("h2", {
              class: "article-title",
              dangerouslySetInnerHTML: { __html: t.title },
            }),
            createElement("section", {
              class: "article-preview",
              dangerouslySetInnerHTML: { __html: t.preview },
            })
          ),
          t.image &&
            createElement(
              "div",
              { class: "article-image" },
              createElement("img", { src: t.image, loading: "lazy" })
            )
        )
      );
    }
  };
  window.addEventListener("load", () => {
    setTimeout(function () {
      let l = document.querySelector(".search-form"),
        t = l.querySelector("input"),
        e = document.querySelector(".search-result--list"),
        r = document.querySelector(".search-result--title");
      new g({
        form: l,
        input: t,
        list: e,
        resultTitle: r,
        resultTitleTemplate: window.searchResultTitleTemplate,
      });
    }, 0);
  });
  var w = g;
})();