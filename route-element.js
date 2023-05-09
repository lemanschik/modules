const routeElementDefinition = {
  connectedCallback() { // Fires before layout paint cycles
  // Above is Atomic. Mutation Hooks still work ofcourse.
     //fetchWithLineIterator(url,(line)=>doc.write(parse(line))).then((done=true)=>
     // Here comes the put cache logic.
     //);
     
     // caches.match(importMetaUrl.pathname).then(exists=>exists || caches.open(importMetaUrl.pathname).then(cache=>
     // cache.addAll([importMetaUrl.pathname,'./modules/marked.esm.js','./service-worker.js'])))
      
     // DOM Utils
     /**
     AND (both classes)
     el.getElementsByClassName("class1 class2");
     el.querySelectorAll(".class1.class2");
     OR (at least one class)
     el.querySelectorAll(".class1,.class2");
     XOR (one class but not the other)
     el.querySelectorAll(".class1:not(.class2),.class2:not(.class1)");
     NAND (not both classes)
     el.querySelectorAll(":not(.class1),:not(.class2)");
     NOR (not any of the two classes)
     el.querySelectorAll(":not(.class1):not(.class2)");
     */  
    
    // deps
    !document.querySelector('link[href="./layout/layout.css"]') && document.head.appendChild(cEl(
      { rel:"stylesheet",href:"./layout/layout.css"},'link'));
    
    !globalThis.gradiantCss && document.head.appendChild(cEl(
      {id:'gradiant-css',rel:"stylesheet",href:"./layout/gradient.css"},'link'));
    
    document.body.classList.add('gradient');
    this.classList.add('row')
    this.classList.add('flex-shrink-0')
    // Routing
    window.onhashchange = () => fetch(new URL(window.location.hash.slice(2),baseUrl))
      .then((r) => r.text()).then(parse).then((innerHTML)=>Object.assign(this,{innerHTML}));
    
    !baseUrl.searchParams?.has('url') && baseUrl.hash && window.onhashchange();
    if (baseUrl.searchParams?.has('url')) {
      window.location.hash=`#!${baseUrl.searchParams.get('url')}`;
      window.location.search = baseUrl.searchParams.delete('url') || baseUrl.search;
    } else if (!window.location.hash && importMetaUrl.searchParams?.has('url')) {
      window.location.hash = `#!${importMetaUrl.searchParams.get('url')}`;
    } else if (!window.location.hash) {
      window.location.hash = `#!${'./index.md'}`;
      //console.log(window.location.hash, window.location.search, importMetaUrl.search)
    }
    
    new MutationObserver((mutationList, observer) => {
      for (const mutation of mutationList) {
        (mutation.type === "childList") ? mutation
          .addedNodes.forEach((el)=>{ 
            (el.nodeName === "DIV" && el.classList.contains('box') || el.nodeName === 'BUTTON')
              && Object.assign(el,{innerHTML:parse(el.innerHTML)});
        }) : (mutation.type === "attributes") &&
         console.log(`The ${mutation.attributeName} attribute was modified.`);
     }
    }).observe(document.body,{ attributes: false, childList: true, subtree: true });
    
  },
  toString(){return `${document.head.outerHTML}\n${document.body.outerHTML}`;}
}
