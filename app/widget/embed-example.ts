export const externalWidgetScriptSnippet = `<script async src="https://your-chat-domain.com/widget.js"></script>`;

export const externalWidgetScriptWithConfigSnippet = `<!-- 可选：先定义配置，再加载脚本 -->
<script>
  window.ChatWidgetConfig = {
    origin: "https://your-chat-domain.com",
    right: "20px",
    bottom: "20px",
    expandedWidth: 432,
    expandedHeight: 784,

  };
</script>
<script async src="https://your-chat-domain.com/widget.js"></script>`;

export const externalWidgetEmbedSnippet = `<!-- 兼容写法：手动 iframe 嵌入 -->
<div id="support-chat-widget-root"></div>
<script>
  (function () {
    const widgetOrigin = "https://your-chat-domain.com";
    const collapsed = { width: 96, height: 96 };
    const expanded = { width: 432, height: 784 };


    const iframe = document.createElement("iframe");
    iframe.src = widgetOrigin + "/widget";
    iframe.title = "Support chat widget";
    iframe.allow = "clipboard-write";
    iframe.style.position = "fixed";
    iframe.style.right = "16px";
    iframe.style.bottom = "16px";
    iframe.style.width = collapsed.width + "px";
    iframe.style.height = collapsed.height + "px";
    iframe.style.border = "0";
    iframe.style.background = "transparent";
    iframe.style.zIndex = "99999";
    iframe.style.overflow = "hidden";
    iframe.style.transition = "width .2s ease, height .2s ease";

    document.getElementById("support-chat-widget-root").appendChild(iframe);

    window.addEventListener("message", function (event) {
      if (event.origin !== widgetOrigin) return;
      if (!event.data || event.data.type !== "chat-widget:toggle") return;

      const nextSize = event.data.open ? expanded : collapsed;
      iframe.style.width = nextSize.width + "px";
      iframe.style.height = nextSize.height + "px";
    });
  })();
</script>`;
