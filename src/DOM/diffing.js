import { isArray, isStringOrNumber, isFunction, isNullOrUndefined, isStatefulComponent } from '../core/utils';
import { replaceNode, SVGNamespace, MathNamespace } from './utils';
import { patchNonKeyedChildren, patchKeyedChildren, patchAttribute, patchComponent } from './patching';
import { mountChildren, mountNode } from './mounting';

export function diffNodes(lastNode, nextNode, parentDom, namespace, lifecycle, context, staticCheck) {
	if (nextNode === false || nextNode === null) {
		return;
	}
	if (isStringOrNumber(lastNode)) {
		if (isStringOrNumber(nextNode)) {
			parentDom.firstChild.nodeValue = nextNode;
		}
		return;
	}
	const nextTag = nextNode.tag || (staticCheck ? nextNode.static.tag : null);
	const lastTag = lastNode.tag || (staticCheck ? lastNode.static.tag : null);

	if (lastNode.events && lastNode.events.willUpdate) {
		lastNode.events.willUpdate(lastNode.dom);
	}
	namespace = namespace || nextTag === 'svg' ? SVGNamespace : nextTag === 'math' ? MathNamespace : null;

	if (lastTag !== nextTag) {
		if (isFunction(lastTag) && !isFunction(nextTag)) {
			if (isStatefulComponent(lastTag)) {
				diffNodes(lastNode.instance._lastNode, nextNode, parentDom, namespace, lifecycle, context, true);
			} else {
				diffNodes(lastNode.instance, nextNode, parentDom, namespace, lifecycle, context, true);
			}
		} else {
			replaceNode(lastNode, nextNode, parentDom, namespace, lifecycle, context);
		}
		return;
	}
	if (isFunction(lastTag) && isFunction(nextTag)) {
		nextNode.instance = lastNode.instance;
		nextNode.dom = lastNode.dom;
		patchComponent(nextNode, nextNode.tag, nextNode.instance, lastNode.attrs, nextNode.attrs, nextNode.events, nextNode.children, parentDom, lifecycle, context);
		return;
	}
	const dom = lastNode.dom;

	nextNode.dom = dom;
	diffChildren(lastNode, nextNode, dom, namespace, lifecycle, context, staticCheck);
	if (lastNode.className !== nextNode.className) {
		dom.className = nextNode.className;
	}
	diffAttributes(lastNode, nextNode, dom);
	diffEvents(lastNode, nextNode, dom);

	if (nextNode.events && nextNode.events.didUpdate) {
		nextNode.events.didUpdate(dom);
	}
}

function diffChildren(lastNode, nextNode, dom, namespace, lifecycle, context, staticCheck) {
	const nextChildren = nextNode.children;
	const lastChildren = lastNode.children;

	if (lastChildren !== nextChildren) {
		if (!isNullOrUndefined(lastChildren)) {
			if (!isNullOrUndefined(nextChildren)) {
				if (isArray(lastChildren)) {
					if (isArray(nextChildren)) {
						const isKeyed = nextChildren.length && nextChildren[0] && !isNullOrUndefined(nextChildren[0].key)
							&& lastChildren.length && lastChildren[0] && !isNullOrUndefined(lastChildren[0].key);

						if (!isKeyed) {
							patchNonKeyedChildren(lastChildren, nextChildren, dom, namespace, lifecycle, context, null);
						} else {
							patchKeyedChildren(lastChildren, nextChildren, dom, namespace, lifecycle, context, null);
						}
					} else {
						patchNonKeyedChildren(lastChildren, [nextChildren], dom, namespace, lifecycle, context, null);
					}
				} else {
					if (isArray(nextChildren)) {
						patchNonKeyedChildren([lastChildren], nextChildren, dom, namespace, lifecycle, context, null);
					} else if (isStringOrNumber(lastChildren)) {
						if (isStringOrNumber(nextChildren)) {
							dom.firstChild.nodeValue = nextChildren;
						}
					} else {
						diffNodes(lastChildren, nextChildren, dom, namespace, lifecycle, context, staticCheck);
					}
				}
			} else {
				dom.textContent = '';
			}
		} else {
			if (isStringOrNumber(nextChildren)) {
				dom.textContent = nextChildren;
			} else if (nextChildren && isArray(nextChildren)) {
				mountChildren(nextChildren, dom, namespace, lifecycle, context);
			} else if (nextChildren && typeof nextChildren === 'object') {
				mountNode(nextChildren, dom, namespace, lifecycle, context);
			}
		}
	}
}

function diffAttributes(lastNode, nextNode, dom) {
	const nextAttrs = nextNode.attrs;
	const lastAttrs = lastNode.attrs;
	const nextAttrsKeys = nextAttrs && Object.keys(nextAttrs);

	// TODO remove attrs we previously had, but no longer have
	if (nextAttrs && nextAttrsKeys.length !== 0) {
		for (let i = 0; i < nextAttrsKeys.length; i++) {
			const attr = nextAttrsKeys[i];
			const lastAttrVal = lastAttrs[attr];
			const nextAttrVal = nextAttrs[attr];

			if (lastAttrVal !== nextAttrVal) {
				patchAttribute(attr, lastAttrVal, nextAttrVal, dom);
			}
		}
	}
}

function diffEvents(lastNode, nextNode, dom) {

}