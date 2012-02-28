<div id="comment_{{id}}" data-comment-index="{{index}}" {{#replyTo}} data-reply-to="{{id}}" {{/replyTo}} class="vox-cmnt-comment{{#recommended}} vox-cmnt-recommended{{/recommended}}">	
  <div class="vox-cmnt-item">
  	{{#commenter}}
  	<a class="vox-cmnt-pic" href="{{ url }}">
  	  <img class="vox-lazyImage" data-original="{{avatarUrl}}" width="32" height="32">
  	</a>
  	{{/commenter}}
  	<h5 class="vox-cmnt-title">
  		{{ title }}
    </h5>
    <div class="vox-cmnt-body">
  		{{{ body }}}
  	</div>
  	<div class="vox-cmnt-sig">
  	{{#commenter}}
  	  {{{ signature }}}
  	{{/commenter}}
    </div>
    <div class="vox-cmnt-meta">
    {{#commenter}}
      by <a href="{{ url }}">{{name}}</a> on 
    {{/commenter}}
      <span class="vox-cmnt-time">{{time}}</span>
    {{#replyTo}}
      <span class="vox-cmnt-up">up</span>
    {{/replyTo}}
    <span class="vox-cmnt-reply">reply</span>
    <span class="vox-cmnt-recommend">recommend</span>
    <span class="vox-cmnt-flag">flag</span>
    </div>
  </div>
</div>