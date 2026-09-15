RUNNING_SHAKE = false
IS_FOCUSED = true
jQuery.fn.shake = function (interval, distance, times) {
	if (RUNNING_SHAKE || !IS_FOCUSED)
		return
	RUNNING_SHAKE = true
	interval = typeof interval == "undefined" ? 100 : interval;
	distance = typeof distance == "undefined" ? 10 : distance;
	times = typeof times == "undefined" ? 3 : times;
	var jTarget = $(this);
	jTarget.css('position', 'relative');
	for (var iter = 0; iter < (times + 1); iter++) {
		jTarget.animate({
			top: ((iter % 2 == 0 ? distance : distance * -1))
		}, interval);
	}
	var ret = jTarget.animate({
		top: 0
	}, interval);
	RUNNING_SHAKE = false
	return ret
}

$(window).blur(function () {
	IS_FOCUSED = false
})
$(window).focus(function () {
	IS_FOCUSED = true
})

$(window).on('resize scroll', function () {
	refreshImages()
	repositionSlickArrows()
});

DEFAULT_SIZE = 1024;
SIZES = [100, 250, 500, 1024];
setTimeout(function () { refreshImages() }, 250)
NUM_IMAGES = 0

function refreshImages() {
	$('.pb-linkimage img').each(function () {
		var el = $(this)
		if (!el.visible(true) && !$('.loading-indicator').length)
			return
		if (!el.data('src'))
			return
		if (el.attr('src'))
			return;

		let parent_group = el.closest('.pb-links')
		if (parent_group.hasClass('d-none') && parent_group.attr('class').indexOf('group-container-') != -1) {
			return;
		}

		if ($('#LB_UserID').val() == -1688591) {
			var url = el.data('src').replace("-" + DEFAULT_SIZE, "-" + SIZES[3])
			el.attr('src', url)
			return
		}

		if ($('#LB_UserID').val() == -2649229 || $('#LB_UserID').val() == -2660193 || $('#LB_UserID').val() == -2660987) {
			var url = el.data('src').replace("-" + DEFAULT_SIZE, "-" + SIZES[2])
			el.attr('src', url)
			return
		}

		for (i = 0; i < SIZES.length; i++) {
			if ((el.width() * 1.2) < SIZES[i] && el.width()) {
				var url = el.data('src').replace("-" + DEFAULT_SIZE, "-" + SIZES[i])
				el.attr('src', url)
				return
			}
		}
		NUM_IMAGES++
		el.attr('src', el.data('src'))
	})
}

IS_start = 48;
IS_limit = 48;
if (typeof (HAS_PAGES) == "undefined") {
	IS_reachedMax = true;
} else if (HAS_PAGES) {
	IS_reachedMax = false;
} else {
	IS_reachedMax = true;
}

IS_done = [0]

function loadMorePosts() {
	if (IS_reachedMax) {
		return;
	}
	if (jQuery.inArray(IS_start, IS_done) !== -1) {
		return;
	}
	if (typeof (NONCE) == "undefined") {
		NONCE = ""
	}
	if (typeof (NONCE_TIME) == "undefined") {
		NONCE_TIME = 0
	}
	let uniqueid = ''
	if ($('#links_container_overall').data('scrollid')) {
		uniqueid = $('#links_container_overall').data('scrollid')
	}

	IS_done.push(IS_start)
	$.ajax({
		url: "/api/",
		method: "POST",
		dataType: "json",
		data: {
			ACTION: 'PUB_getMoreLinks',
			nonce: NONCE,
			nonce_time: NONCE_TIME,
			start: IS_start,
			limit: IS_limit,
			user_id: $('#LB_UserID').val(),
			uniqueid: uniqueid,
			token: CSFR_TOKEN
		},
		success: function (res) {
			if (res.status) {
				for (let group_id in res.info.links) {
					let group_links = res.info.links[group_id]
					$('div.group-container-' + group_id).append(group_links.join("\n"));
					$('div.group-container-' + group_id).removeClass('d-none').addClass('d-flex')
					$('h5.group-container-' + group_id).removeClass('d-none').addClass('d-block')
				}
				refreshImages()
				IS_start += IS_limit;
			}
			if (res.info.reached_max) {
				IS_reachedMax = true;
			}
			if (typeof (res.info.last_link) != "undefined") {
				LAST_LINK_ID = res.info.last_link
			}

		}
	});
}

let lnksLazyGroupObserver = null;

function loadLazyGroup(sentinel) {
	if (sentinel.dataset.loading === "1" || sentinel.dataset.done === "1") {
		return;
	}
	sentinel.dataset.loading = "1";
	let start = parseInt(sentinel.dataset.start, 10);
	let limit = parseInt(sentinel.dataset.limit, 10);
	let nonce = (typeof (NONCE) != "undefined") ? NONCE : "";
	let nonceTime = (typeof (NONCE_TIME) != "undefined") ? NONCE_TIME : 0;
	$.ajax({
		url: "/api/",
		method: "POST",
		dataType: "json",
		data: {
			ACTION: 'PUB_getMoreLinks',
			lazy_group: 1,
			nonce: nonce,
			nonce_time: nonceTime,
			uniqueid: sentinel.dataset.uniqueid,
			start: start,
			limit: limit,
			user_id: $('#LB_UserID').val(),
			token: CSFR_TOKEN
		},
		success: function (res) {
			sentinel.dataset.loading = "0";
			let appended = false;
			if (res.status && res.info && res.info.links && res.info.links.length) {
				let container = sentinel.previousElementSibling ? sentinel.previousElementSibling.querySelector('[class*="group-container-"]') : null;
				if (container) {
					$(container).append(res.info.links.join("\n"));
					refreshImages();
					if ($('.public-container').hasClass('slick-initialized')) {
						$('.public-container').slick('setPosition');
					}
					sentinel.dataset.start = start + limit;
					appended = true;
				}
			}
			if (!res.info || res.info.reached_max || !appended) {
				sentinel.dataset.done = "1";
				lnksLazyGroupObserver.unobserve(sentinel);
			} else {
				lnksLazyGroupObserver.unobserve(sentinel);
				lnksLazyGroupObserver.observe(sentinel);
			}
		},
		error: function () {
			sentinel.dataset.loading = "0";
		}
	});
}

$(function () {
	let sentinels = document.querySelectorAll('.lnks-lazy-sentinel');
	if (!sentinels.length) {
		return;
	}
	lnksLazyGroupObserver = new IntersectionObserver(function (entries) {
		entries.forEach(function (entry) {
			if (!entry.isIntersecting) {
				return;
			}
			loadLazyGroup(entry.target);
		});
	}, {
		rootMargin: "400px 0px"
	});
	sentinels.forEach(function (el) {
		lnksLazyGroupObserver.observe(el);
	});
});

function repositionSlickArrows() {
	const isRTL = document.documentElement.dir === 'rtl'
	var difference = Math.round(($(document).width() - $('.maincontainer').width()) / 2);
	if (difference > 50) {
		difference = difference - 40;
	}
	if (isRTL) {
		$('.slick-next').attr('style', 'left:' + difference + 'px !important; right:auto!important');
		$('.slick-prev').attr('style', 'right:' + difference + 'px !important; left:auto!important');
	} else {
		$('.slick-next').attr('style', 'right:' + difference + 'px !important');
		$('.slick-prev').attr('style', 'left:' + difference + 'px !important');
	}
}

const linkObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;

    const el = entry.target;
    if (el.dataset.animated === "1") return;

    // lock immediately so it cannot fire again
    el.dataset.animated = "1";
    // linkObserver.unobserve(el);

    // run animation after scroll work is done
    requestAnimationFrame(() => {
      const $el = $(el);
      // Example: CSS class that animates once
      $el.addClass("lnk_ani_active");

      // remove to keep DOM clean (optional)
      setTimeout(() => {
		$el.removeClass("lnk_ani_active");
		}, 4000);
    });
  });
}, {
  threshold: 0.6,
  rootMargin: "0px 0px -10% 0px" // helps avoid firing at the exact edge
});

$(function() {
	// Old version - Shake or Vibrate
	$(".vibrate").shake(400, 5, 3);
	setInterval(function () {
		$(".vibrate").shake(400, 5, 3);
	}, 4000)
	// Modern
	$(".lnk_ani_trigger").each(function () {
		linkObserver.observe(this);
	});
});

$(window).scroll(function () {

	if ($(window).width() < 500) {
		if ($(document).height() - $(window).height() - $(window).scrollTop() <= 500) {
			loadMorePosts();
		} else {
			if (typeof (LAST_LINK_ID) != "undefined") {
				if ($('#PB_L_' + LAST_LINK_ID).length) {
					let last_pos = Math.round($('#PB_L_' + LAST_LINK_ID).position().top - ($('#PB_L_' + LAST_LINK_ID).height() + 200))
					let window_scroll = Math.round($(window).scrollTop())
					let window_height = Math.round($(window).height() / 2)
					if (window_scroll + window_height > last_pos) {
						loadMorePosts();
					}
				}

			}
		}
	} else {
		if ($(document).height() - $(window).height() - $(window).scrollTop() <= 300) {
			loadMorePosts();
		} else {
			if (typeof (LAST_LINK_ID) != "undefined") {
				if ($('#PB_L_' + LAST_LINK_ID).length) {
					let last_pos = Math.round($('#PB_L_' + LAST_LINK_ID).position().top - ($('#PB_L_' + LAST_LINK_ID).height() + 200))
					let window_scroll = Math.round($(window).scrollTop())
					let window_height = Math.round($(window).height() / 2)
					if (window_scroll + window_height > last_pos) {
						loadMorePosts();
					}
				}
			}
		}
	}
});

$(window).on("beforeunload", function () {
	$(window).scrollTop(0);
});

function iOSorAndroid() {
	var userAgent = navigator.userAgent || navigator.vendor || window.opera;
	if (/android/i.test(userAgent)) {
		return "AND";
	}
	if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
		return "IOS";
	}
	return false;
}
if (typeof (DEEPLINKING_DISABLED) == "undefined") {
	DEEPLINKING_DISABLED = false;
}

if (iOSorAndroid() !== false && !DEEPLINKING_DISABLED) {
	$('.deep-links a,a.deep-linking').click(function (e) {
		var icon = $(e.target)
		if ($(this).hasClass('pb-linkbox')) {
			var a = $(this)
		} else {
			var a = icon.parent()
		}
		var tracked = a.attr("href")
		var url = a.data('url')
		var network = a.data('network')
		if (network == 'SOCIAL_TW') { // Twitter
			var R = new RegExp(/https:\/\/(www\.)?twitter\.com\/([^\/\?]+)/, 'i')
			var parts = R.exec(url);
			var username = parts[2];
			LB_OpenTwitter(username, url)
		} else if (network == 'SOCIAL_FB') { // Facebook
			var R = new RegExp(/https:\/\/(www\.)?facebook\.com\/([^\?]+)/, 'i')
			var parts = R.exec(url);
			var username = parts[2];
			LB_OpenFacebook(username, url)
		} else if (network == 'SOCIAL_YT' || network == "MUSIC_YTB" || network == "MUSIC_YTM") { // YouTube
			var to_open = url.replace("https://", "");
			to_open = to_open.replace("http://", "");
			LB_OpenYouTube(to_open, url)
		} else if (network == 'SOCIAL_SN') { // Snapchat
			var R = new RegExp(/https:\/\/(www\.)?snapchat\.com\/add\/([^\/\?]+)/, 'i')
			var parts = R.exec(url);
			var username = parts[2];
			LB_OpenSnapchat(username, url)
		} else if (network == 'SOCIAL_IG') { // Instagram
			var R = new RegExp(/https:\/\/(www\.)?instagram\.com\/([^\/\?]+)/, 'i')
			var parts = R.exec(url);
			var username = parts[2];
			LB_OpenInstagram(username, url)
		} else if (network == 'CONTACT_WA') { // Instagram
			return;
			var R = new RegExp(/http[s]?:\/\/(www\.)?wa\.me\/([^\/\?]+)/, 'i')
			var parts = R.exec(url);
			var number = parts[2];
			LB_OpenWhatsapp(number, url)
		} else
			return

		$.ajax({
			type: "POST",
			url: "/api/",
			data: {
				ACTION: "IC_track",
				url: url,
				network: network,
				user_id: $('#LB_UserID').val(),
				timezone: $('#LB_UserTimezone').val(),
				token: CSFR_TOKEN
			}
		})

		e.preventDefault();
	});

	LB_TRACKED_LINK = '';
	LB_TRACKED_TIME = 0;
	LB_TRACKED_FUNC = false;

	$(window).blur(function (e) {
		if (LB_TRACKED_FUNC) {
			clearTimeout(LB_TRACKED_FUNC)
		}
	});
}

function appdlPlatform() {
	var userAgent = navigator.userAgent || navigator.vendor || window.opera;
	if (/HuaweiBrowser|HarmonyOS|HMSCore/i.test(userAgent) && !/GMSCore/i.test(userAgent)) {
		return "HUAWEI";
	}
	if (/android/i.test(userAgent)) {
		return "AND";
	}
	if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
		return "IOS";
	}
	if (/Macintosh|Mac OS/.test(userAgent) && navigator.maxTouchPoints > 2) {
		return "IOS";
	}
	return false;
}

function appdlAnyStore(stores) {
	return stores.IOS || stores.AND || stores.HUAWEI
}

function appdlFillChooser(modal, stores) {
	var container = modal.find('.appdl-stores')
	container.empty()
	var defs = [
		{ url: stores.IOS, icon: 'fab fa-apple', label: 'App Store' },
		{ url: stores.AND, icon: 'fab fa-google-play', label: 'Google Play' },
		{ url: stores.HUAWEI, icon: 'far fa-mobile', label: 'Huawei AppGallery' }
	]
	for (var i = 0; i < defs.length; i++) {
		if (!defs[i].url) {
			continue
		}
		var btn = $('<a>', {
			class: 'btn btn-milka text-white btn-pagnottona w-100 mb-3 ts-bigger',
			rel: 'external nofollow ugc',
			href: defs[i].url
		})
		btn.append($('<i>', { class: defs[i].icon }))
		btn.append(document.createTextNode(' ' + defs[i].label))
		container.append(btn)
	}
}

$('body').on('click', 'a.appdownload-link', function (e) {
	var a = $(this)
	var stores = { IOS: a.data('ios'), AND: a.data('android'), HUAWEI: a.data('huawei') }
	var platform = appdlPlatform()
	if (platform) {
		var target = stores[platform]
		if (!target && platform == 'HUAWEI') {
			target = stores.AND
		}
		if (!target) {
			target = appdlAnyStore(stores)
		}
		if (target) {
			e.preventDefault()
			window.location.href = target
			return
		}
	}
	if (a.data('fallback')) {
		return
	}
	e.preventDefault()
	var modal = $('#PUB_AppDownloadModal')
	if (!modal.length) {
		var any = appdlAnyStore(stores)
		if (any) {
			window.location.href = any
		}
		return
	}
	appdlFillChooser(modal, stores)
	modal.modal('show')
})

function orNormalRedirect(tracked) {
	LB_TRACKED_LINK = tracked;
	LB_TRACKED_TIME = new Date();
	LB_TRACKED_FUNC = setTimeout(function () {
		var current_time = new Date();
		var timeDiff = current_time - LB_TRACKED_TIME;
		if (timeDiff < 1000) {
			history.pushState(null, null, location.href.toString());
			location.replace(LB_TRACKED_LINK)
		}
	}, 500);
}


function LB_OpenTwitter(username, tracked) {
	location.replace("twitter://user/?screen_name=" + username);
	orNormalRedirect(tracked)
}

function LB_OpenFacebook(username, tracked) {
	if (iOSorAndroid() == "AND") {
		location.href = "fb://facewebmodal/f?href=https://www.facebook.com/" + username;
	}
	orNormalRedirect(tracked)
}

function LB_OpenWhatsapp(number, tracked) {
	location.href = "whatsapp://send?phone=" + number;
	orNormalRedirect(tracked)
}



function LB_OpenYouTube(to_open, tracked) {
	if (iOSorAndroid() == "AND") {
		location.replace("vnd.youtube://" + to_open);
	} else if (iOSorAndroid() == "IOS") {
		location.replace("youtube://" + to_open);
	}
	orNormalRedirect(tracked)
}

function LB_OpenSnapchat(username, tracked) {
	location.href = "snapchat://add/" + username;
	orNormalRedirect(tracked)
}

function LB_OpenInstagram(username, tracked) {
	location.href = "instagram://user?username=" + username;
	orNormalRedirect(tracked)
}

function LP_ReloadImg(el) {
	el.src = el.src + "&v=" + Math.random(10, 99)
}

// Donation
$('.pb-supportme').on('click', function () {
	$(this).find('.pb-donate-form').slideDown(function () {
		footerPositionUpdate()
	})
	$(this).parent().find('.pb-close').show()
	$(this).parent().addClass('donate-open')
	footerPositionUpdate()

})
$('.pb-close').on('click', function () {
	var parent = $(this).parent();
	parent.find('.pb-donate-form').slideUp(function () {
		footerPositionUpdate()
	})
	$(this).hide()
	parent.removeClass('donate-open')
	footerPositionUpdate()

})
$('.pb-d-value').on('click', function (e) {
	var val = $(this).data('value')
	var parent = $(this).parents('.pb-donate-form');
	parent.find('.pb-d-tip').val(val)
	parent.find('.pb-d-value').removeClass('btn-outline-paypal')
	parent.find('.pb-d-value').addClass('btn-paypal')
	$(this).addClass('btn-outline-paypal')
	$(this).removeClass('btn-paypal')
})
$('.pb-d-paypal').on('click', function (e) {
	var parent = $(this).parents('.pb-support-parent');
	e.preventDefault()
	var val = parent.find('.pb-d-tip').val()
	if (val > 0) {
		parent.find('.pb-d-value').val(val)
		var text = parent.find('.pb-d-message').val()
		parent.find('.pb-d-text').val(text);
		$.ajax({
			type: "POST",
			url: "/api/",
			data: {
				ACTION: "U_addDonation",
				eid: $('#LB_UserID').val(),
				token: CSFR_TOKEN
			}
		})
		parent.find('.pb_d_form')[0].submit()

		$('#pb-donate-form').slideUp()
		$('.pb-close').hide()
	}
	return false;
})

$('.public-container').on('beforeChange', function (event, slick, currentSlide, nextSlide) {
	var container = $('#slick-slide0' + nextSlide)
	$('.page-inject').addClass('d-none')
	$('.page-inject-' + container.data('page-id')).removeClass("d-none")
});


if ($('#PB_SignupModal').length > 0) {
	$('.footer-signup').on('click', function (e) {
		e.preventDefault();
		$.getScript("/202006/js/lnkbio.login.js?rand=" + Math.random());
		$.getScript("https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/js/bootstrap.bundle.min.js", function () {
			$('#PB_SignupModal').modal('show')
			modalIsLoading($('#PB_SignupModal'))
			$.ajax({
				type: "POST",
				url: "/api/",
				data: {
					ACTION: "PUB_getSignupModal",
					ref: $('#LB_UserID').val(),
					token: CSFR_TOKEN
				},
				success: function (res) {
					if (res.status) {
						$('#PB_SignupModal').find('.loaded-container').html(res.info.html)
						modalHasLoaded($('#PB_SignupModal'))
					}
				}
			})
		});
	})
	$('#PB_SignupModal').find('.close').on('click', function (e) {
		$('#PB_SignupModal').removeClass('d-block')
	})
	$('#PB_SignupModal').on('click', '.check-consent', function () {
		if (checkConsent()) {
			modalIsLoading($('#PB_SignupModal'))
			if ($(this).data('link')) {
				location.href = $(this).data('link')
			} else if ($(this).data('next')) {
				if ($(this).data('next') == "LN_TwitterRedir") {
					LN_TwitterRedir(true)
				}
			}
		}
	});
	$('#PB_SignupModal').on('click', '.login-button.fb-signup-btn', function () {
		if (checkConsent()) {
			FB.login(function (response) {
				fbSignup(response);
			}, {
				scope: 'instagram_basic,pages_show_list,'
			});
		}
	});
}

$('#PB_IconDetailsModal').on('show.bs.modal', function (e) {
	let modal = $(this)
	modalIsLoading(modal)
	$('#icon-copied-button').addClass('d-none')
	$('#icon-copy-button').removeClass('d-none')
	let icon = $(e.relatedTarget)
	$.ajax({
		type: "POST",
		url: "/api/",
		data: {
			ACTION: "IC_track",
			url: icon.data('text'),
			network: icon.data('network'),
			user_id: $('#LB_UserID').val(),
			timezone: $('#LB_UserTimezone').val(),
			token: CSFR_TOKEN
		}
	})
	$('#PB_IconDetailsCopyInput').val(icon.data('text').toString().replace('&rho;', 'ρ'))
	let icon_class = icon.find('i').attr('class').replace('ts-icons-public', '').replace('ts-icons-bigger', '').replace('ts-internaltitle', '').replace('ts-midhuge', '').replace('mt-4', '')
	let $icon_el = $('<i/>').addClass((icon_class || '') + ' ts-title')
	modal.find('.modal-title').empty().append($icon_el).append(' ').append(document.createTextNode(icon.data('label') || ''))
	modalHasLoaded(modal)
})

function copyIcon() {
	$('#icon-copied-button').removeClass('d-none')
	$('#icon-copy-button').addClass('d-none')
	var copyText = document.getElementById("icon-copy-text");
	copyText.select();
	copyText.setSelectionRange(0, 99999);
	document.execCommand("copy");
}

$('#PB_IconDetailsModal').on('click', '#icon-copy-button', function (e) {
	e.preventDefault();
	copyIcon()
})

function checkShopModalHeight() {
	if ((window.innerHeight - 50) < $('#PB_ShopModal').find('.modal-dialog').height()) {
		$('#PB_ShopModal').addClass('modal-fullscreen')
		$('#PB_ShopModal').find('.modal-header').addClass('modal-header-fullscreen')
		$('#PB_ShopModal').data('noslidedown', true);
	} else {
		$('#PB_ShopModal').removeClass('modal-fullscreen')
		$('#PB_ShopModal').find('.modal-header').removeClass('modal-header-fullscreen')
		$('#PB_ShopModal').data('noslidedown', false);
	}
}

PHY_STATE = {
	is_physical: false,
	link_id: 0,
	price: 0,
	price_formatted: '',
	currency: '',
	variants: [],
	has_variants: false,
	variant_id: 0,
	countries: [],
	methods: [],
	method_id: 0,
	shipping_cost: 0,
	address: {},
	has_paypal: false,
	has_stripe: false
}

// Applied coupon state. Reset to {} when the modal opens, the buyer hits
// Remove, or a re-validation fails after shipping changes the total.
PB_COUPON_STATE = { coupon_id: 0, code: '', discount: 0 }
function PB_couponClear() {
	PB_COUPON_STATE = { coupon_id: 0, code: '', discount: 0 }
	$('.PB_ShopCouponInput').val('')
	$('.PB_ShopCouponError').addClass('d-none').text('')
	$('.PB_ShopCouponApplied').addClass('d-none')
	$('.PB_ShopCouponBox').addClass('d-none')
	$('#PB_ShopPriceAfter').addClass('d-none').empty()
	if (typeof PHY_renderTotals === 'function') {
		PHY_renderTotals()
	}
}
function PB_couponShowApplied() {
	// Prefer the currency symbol ($) over the raw code; fall back to the code
	// (and finally to nothing) so the discount value is never bare.
	let cur = PHY_STATE.currency_symbol || PHY_STATE.currency || ''
	let label = PB_COUPON_STATE.code + '  −' + cur + ' ' + PB_COUPON_STATE.discount.toFixed(2)
	$('.PB_ShopCouponApplied .PB_ShopCouponLabel').text(label)
	$('.PB_ShopCouponApplied').removeClass('d-none')
	$('.PB_ShopCouponBox').addClass('d-none')
	$('.PB_ShopCouponError').addClass('d-none').text('')
	// Digital / service: surface the new total directly under the price line
	// so the buyer sees what they'll actually pay before clicking Buy. For
	// physical, the step3 totals block already shows the breakdown.
	if (!PHY_STATE.is_physical && PB_COUPON_STATE.discount > 0) {
		let after = Math.max(0, PHY_STATE.price - PB_COUPON_STATE.discount)
		let $el = $('#PB_ShopPriceAfter')
		// Use jQuery DOM construction (no .html() with concatenated values)
		// so the currency symbol is treated as text, not parsed as markup.
		$el.empty()
			.append($('<span/>').text('After discount: '))
			.append($('<strong/>').addClass('text-newblack').text(cur + after.toFixed(2)))
			.removeClass('d-none')
	} else {
		$('#PB_ShopPriceAfter').addClass('d-none').empty()
	}
	if (typeof PHY_renderTotals === 'function') {
		PHY_renderTotals()
	}
}
$('#PB_ShopModal').on('show.bs.modal', function (e) {
	$('#PUB_LnkSearchModal').modal('hide')
	var btn = $(e.relatedTarget)
	var link_id = btn.data('id')
	if (!link_id || link_id <= 0) {
		return
	}
	modalIsLoading($('#PB_ShopModal'))
	$('#PB_ShopModal').find('input[name="accept_terms"]:not(.accepted_already)').prop("checked", false);
	PHY_resetSteps()
	PB_couponClear()
	$.ajax({
		url: "/api/",
		method: "POST",
		dataType: "json",
		data: {
			ACTION: 'LN_getPrice',
			link_id: link_id,
			user_id: $('#LB_UserID').val(),
			token: CSFR_TOKEN
		},
		success: function (res) {
			modalHasLoaded($('#PB_ShopModal'))
			if (res.status) {
				PHY_STATE.is_physical = !!res.info.is_physical
				PHY_STATE.link_id = res.info.link_id
				PHY_STATE.price = parseFloat(res.info.price || 0)
				PHY_STATE.price_formatted = res.info.price_formatted || ''
				PHY_STATE.currency = res.info.currency || ''
				PHY_STATE.currency_symbol = res.info.currency_symbol || ''
				// "Have a coupon?" toggle visibility. Hide both wraps when the
				// seller has zero coupons; show them otherwise.
				if (res.info.has_coupons) {
					$('.PB_ShopCouponWrap').removeClass('d-none')
				} else {
					$('.PB_ShopCouponWrap').addClass('d-none')
				}
				PHY_STATE.variants = res.info.variants || []
				PHY_STATE.has_variants = !!res.info.has_variants
				PHY_STATE.countries = res.info.countries || []
				PHY_STATE.has_paypal = !!res.info.has_paypal
				PHY_STATE.has_stripe = !!res.info.has_stripe
				PHY_STATE.variant_id = 0
				PHY_STATE.method_id = 0
				PHY_STATE.shipping_cost = 0
				PHY_STATE.address = {}

				PHY_STATE.product_title = res.info.title || ''
				PHY_setTitle(PHY_STATE.product_title)
				$('#PB_ShopTitle').text(res.info.title)
				$('#PB_ShopPrice').text(res.info.price_formatted)
				$('#PB_ShopButton').data('id', res.info.link_id)
				PHY_STATE.product_image = res.info.image || ''
				PHY_STATE.product_icon_class = res.info.icon_class || ''
				PHY_STATE.product_icon_style = res.info.icon_style || ''
				PB_renderHero(PHY_STATE.product_image, PHY_STATE.product_icon_class, PHY_STATE.product_icon_style)
				if (res.info.description) {
					$('#PB_ShopDescription').removeClass("d-none")
					$('#PB_ShopDescription').text(res.info.description)
				} else {
					$('#PB_ShopDescription').addClass("d-none")
				}
				if (!$($('.cc-card')[0]).attr('src')) {
					$(".cc-card").each(function () {
						$(this).attr('src', $(this).data('src'))
					});
				}
				if (PHY_STATE.is_physical) {
					$('.PB_ShopDigital').addClass('d-none')
					$('.PB_ShopPhysical').removeClass('d-none')
					PHY_renderVariants()
					PHY_populateCountries()
					PHY_STATE.sold_out = !!res.info.sold_out
					if (PHY_STATE.sold_out) {
						$('#PB_ShopSoldOut').removeClass('d-none')
						$('#PB_ShopPrice')
							.empty()
							.append($('<span/>').addClass('text-secondary text-decoration-line-through me-2').text(res.info.price_formatted))
							.append($('<span/>').addClass('text-danger fw-bold ts-title text-uppercase').text('Sold out'))
						$('#PB_ShopNoShip').addClass('d-none')
						$('#PB_ShopNoPayment').addClass('d-none')
						$('#PB_ShopContinue').addClass('d-none')
						$('#PB_ShopVariantsWrap').addClass('d-none')
						$('#PB_ShopModal').find('input[name="accept_terms"]').closest('.form-check,label').addClass('d-none')
					} else {
						$('#PB_ShopSoldOut').addClass('d-none')
						$('#PB_ShopContinue').removeClass('d-none')
						$('#PB_ShopModal').find('input[name="accept_terms"]').closest('.form-check,label').removeClass('d-none')
						if (!PHY_STATE.has_stripe) {
							$('#PB_ShopStripePhysical').addClass('d-none')
						} else {
							$('#PB_ShopStripePhysical').removeClass('d-none')
						}
						if (!PHY_STATE.has_paypal) {
							$('#paypal-button-container-physical').addClass('d-none')
						} else {
							$('#paypal-button-container-physical').removeClass('d-none')
						}
						let has_any_payment = PHY_STATE.has_stripe || PHY_STATE.has_paypal
						let no_countries = !PHY_STATE.countries || PHY_STATE.countries.length === 0
						if (!has_any_payment) {
							$('#PB_ShopNoPayment').removeClass('d-none')
							$('#PB_ShopNoShip').addClass('d-none')
							$('#PB_ShopContinue').attr('disabled', true)
						} else if (no_countries) {
							$('#PB_ShopNoPayment').addClass('d-none')
							$('#PB_ShopNoShip').removeClass('d-none')
							$('#PB_ShopContinue').attr('disabled', true)
						} else {
							$('#PB_ShopNoPayment').addClass('d-none')
							$('#PB_ShopNoShip').addClass('d-none')
							$('#PB_ShopContinue').attr('disabled', false)
						}
					}
				} else {
					$('.PB_ShopDigital').removeClass('d-none')
					$('.PB_ShopPhysical').addClass('d-none')
					if (res.info.has_paypal) {
						payPalInit(res.info)
					}
					if (!res.info.has_stripe) {
						$('.PB_Stripe').addClass('d-none')
					}
				}

				setTimeout(function () { checkShopModalHeight() }, 200)
			}
		}
	});
})

function PHY_resetSteps() {
	$('.PB_ShopStep').addClass('d-none')
	$('.PB_ShopStep1').removeClass('d-none')
	$('#PB_ShopVariantsWrap').addClass('d-none')
	$('#PB_ShopMethods').empty()
	$('#PB_ShopNoMethods').addClass('d-none')
	$('#PB_ShopStep2Error').addClass('d-none')
	$('#PB_ShopModal').find('.PB_ShopStep2 input').val('')
}
function PHY_setTitle(text) {
	$('#PB_ShopHeaderTitle').text(text || '')
}
function PHY_renderVariants() {
	let sel = $('#PB_ShopVariant')
	sel.empty()
	if (!PHY_STATE.has_variants) {
		if (PHY_STATE.variants.length > 0) {
			PHY_STATE.variant_id = PHY_STATE.variants[0].variant_id
		}
		$('#PB_ShopVariantsWrap').addClass('d-none')
		return
	}
	sel.append('<option value="">' + (sel.data('placeholder') || 'Select an option') + '</option>')
	PHY_STATE.variants.forEach(function(v) {
		if (v.is_default) return
		let opt = $('<option />').val(v.variant_id)
		let label = v.title
		if (v.available <= 0) {
			label += ' (Sold out)'
			opt.attr('disabled', true)
		}
		opt.text(label)
		sel.append(opt)
	})
	$('#PB_ShopVariantsWrap').removeClass('d-none')
}
function PHY_populateCountries() {
	let sel = $('#PB_ShopCountry')
	sel.find('option:not(:first)').remove()
	PHY_STATE.countries.forEach(function(c) {
		sel.append($('<option />').val(c.code).text(c.name))
	})
}
$(document).on('change', '#PB_ShopVariant', function() {
	PHY_STATE.variant_id = parseInt($(this).val() || 0, 10)
	let v = null
	for (let i = 0; i < PHY_STATE.variants.length; i++) {
		if (PHY_STATE.variants[i].variant_id === PHY_STATE.variant_id) {
			v = PHY_STATE.variants[i]
			break
		}
	}
	if (v && v.image) {
		PB_renderHero(v.image, '', '')
	} else {
		PB_renderHero(PHY_STATE.product_image, PHY_STATE.product_icon_class, PHY_STATE.product_icon_style)
	}
})

function PB_renderHero(image_url, icon_class, icon_style) {
	let hero = $('#PB_ShopImg')
	if (icon_class) {
		let wrap_cls = icon_style ? 'bg-transparent' : 'lnkbio-icontxtcolor lnkbio-iconbgcolor'
		let $wrap = $('<div/>').addClass('pb-shop-icon-hero ' + wrap_cls + ' d-flex align-items-center justify-content-center rounded w-100')
			.css('height', '200px')
		let $icon = $('<i/>').addClass(icon_class).css('font-size', '5rem')
		if (icon_style) { $icon.attr('style', $icon.attr('style') + ';' + icon_style) }
		$wrap.append($icon)
		hero.empty().append($wrap).removeClass('d-none')
	} else if (image_url) {
		let $img = $('<img/>').addClass('w-100 mh-300 autocrop rounded').attr('src', image_url).attr('referrerpolicy', 'no-referrer')
		hero.empty().append($img).removeClass('d-none')
	} else {
		hero.empty().addClass('d-none')
	}
}
$(document).on('click', '#PB_ShopContinue', function() {
	let step1 = $('#PB_ShopModal').find('.PB_ShopStep1')
	$('#PB_ShopTermsError').addClass('d-none')
	modalHideBuiltinErrors(step1)
	let accept = $('#PB_ShopModal').find('input[name="accept_terms"]')
	if (!accept.is(':checked')) {
		$('#PB_ShopTermsError').removeClass('d-none')
		return
	}
	if (PHY_STATE.has_variants && !PHY_STATE.variant_id) {
		modalShowBuiltinErrors(step1, 'Please select an option')
		return
	}
	$('.PB_ShopStep').addClass('d-none')
	$('.PB_ShopStep2').removeClass('d-none')
	PHY_setTitle($('#PB_ShopHeaderTitle').data('step-address'))
	setTimeout(function () { checkShopModalHeight() }, 200)
})
$(document).on('click', '#PB_ShopBack2', function() {
	$('.PB_ShopStep').addClass('d-none')
	$('.PB_ShopStep1').removeClass('d-none')
	PHY_setTitle(PHY_STATE.product_title)
	// Downstream state belongs to the address/shipping step. If the buyer
	// changes variant (or anything else) and advances again, step2/step3 must
	// start clean so the old fetched methods don't get reused.
	PHY_STATE.methods = []
	PHY_STATE.method_id = 0
	PHY_STATE.shipping_cost = 0
})
$(document).on('click', '#PB_ShopBack3', function() {
	$('.PB_ShopStep').addClass('d-none')
	$('.PB_ShopStep2').removeClass('d-none')
	PHY_setTitle($('#PB_ShopHeaderTitle').data('step-address'))
})
$(document).on('change', '#PB_ShopCountry', function() {
	$('#PB_ShopNoMethods').addClass('d-none')
	PHY_STATE.methods = []
	PHY_STATE.method_id = 0
	PHY_STATE.shipping_cost = 0
})
$(document).on('change', 'input[name="pb_ship_method"]', function() {
	let mid = parseInt($(this).val(), 10)
	PHY_STATE.method_id = mid
	for (let i = 0; i < PHY_STATE.methods.length; i++) {
		if (PHY_STATE.methods[i].method_id === mid) {
			PHY_STATE.shipping_cost = PHY_STATE.methods[i].rate
			break
		}
	}
	$('#PB_ShopMethods .pb-ship-method-row').removeClass('is-selected')
	$(this).closest('.pb-ship-method-row').addClass('is-selected')
	PHY_renderTotals()
})
function PHY_renderTotals() {
	$('#PB_ShopRecapSubtotal').text(PHY_STATE.currency + ' ' + PHY_STATE.price.toFixed(2))
	$('#PB_ShopRecapShipping').text(PHY_STATE.currency + ' ' + PHY_STATE.shipping_cost.toFixed(2))
	let discount = parseFloat(PB_COUPON_STATE.discount || 0) || 0
	if (discount > 0) {
		$('#PB_ShopRecapDiscountLabel').text('Coupon ' + PB_COUPON_STATE.code)
		$('#PB_ShopRecapDiscount').text('−' + PHY_STATE.currency + ' ' + discount.toFixed(2))
		$('#PB_ShopRecapDiscountWrap').removeClass('d-none')
	} else {
		$('#PB_ShopRecapDiscountWrap').addClass('d-none')
	}
	let total = Math.max(0, PHY_STATE.price - discount) + PHY_STATE.shipping_cost
	$('#PB_ShopRecapTotal').text(PHY_STATE.currency + ' ' + total.toFixed(2))
}

// --- Coupon UI handlers (PB_ShopModal) ---
$(document).on('click', '.PB_ShopCouponToggle', function(e) {
	e.preventDefault()
	let target = $(this).data('target')
	$('#' + target).removeClass('d-none').find('.PB_ShopCouponInput').focus()
})
// Force uppercase as the buyer types so the visible code matches what the
// server stored.
$(document).on('input', '.PB_ShopCouponInput', function() {
	let v = $(this).val()
	let up = (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
	if (v !== up) {
		$(this).val(up)
	}
})
// Disable / re-enable the buy/pay buttons during an in-flight Apply request
// so a buyer can't click Buy before the coupon validation returns (otherwise
// they'd be charged the full price while expecting a discount).
function PB_couponLockBuyButtons(lock) {
	let sel = '#PB_ShopButton, .PB_ShopButton, #PB_ShopContinue, #PB_ShopStripePhysical, #PB_ShopContinue2'
	$(sel).prop('disabled', !!lock)
	// PayPal Smart Buttons are rendered in iframes; pointer-events on the
	// container disables them visually + functionally during the lock window.
	$('#paypal-button-container, #paypal-button-container-physical').css('pointer-events', lock ? 'none' : '')
}
$(document).on('click', '.PB_ShopCouponApply', function() {
	let suffix = $(this).data('suffix')
	let input = $('#PB_ShopCouponInput' + suffix)
	let err = $('#PB_ShopCouponError' + suffix)
	let $btn = $(this)
	let code = (input.val() || '').trim().toUpperCase()
	err.addClass('d-none').text('')
	if (!code) {
		err.text('Enter a coupon code').removeClass('d-none')
		return
	}
	$btn.prop('disabled', true)
	PB_couponLockBuyButtons(true)
	$.post('/api/', {
		ACTION: 'LN_applyCoupon',
		link_id: PHY_STATE.link_id,
		user_id: $('#LB_UserID').val(),
		token: CSFR_TOKEN,
		code: code,
		variant_id: PHY_STATE.variant_id || 0,
		method_id: PHY_STATE.method_id || 0
	}, function(res) {
		if (res.status) {
			PB_COUPON_STATE.coupon_id = parseInt(res.info.coupon_id || 0, 10)
			PB_COUPON_STATE.code = res.info.code || code
			PB_COUPON_STATE.discount = parseFloat(res.info.discount_amount || 0)
			PB_couponShowApplied()
		} else {
			err.text((res.errors && res.errors[0]) || 'Invalid coupon code').removeClass('d-none')
		}
	}, 'json').always(function() {
		// Always re-enable, even on AJAX failure, so the buyer is never
		// stranded with a permanently-disabled Buy button.
		$btn.prop('disabled', false)
		PB_couponLockBuyButtons(false)
	})
})
$(document).on('click', '.PB_ShopCouponRemove', function(e) {
	e.preventDefault()
	PB_couponClear()
})
// When the buyer changes shipping method on step3, the discount itself
// doesn't change (applies to product only) but the final-total floor check
// might now fail. Revalidate quietly; if the coupon is no longer accepted,
// strip it and raise a prominent inline error at the top of step3 so the
// buyer notices the change (the small red text inside the coupon box is
// easy to miss when the eye is already on the Pay buttons).
$(document).on('change', 'input[name="pb_ship_method"]', function() {
	if (!PB_COUPON_STATE.coupon_id) { return }
	$.post('/api/', {
		ACTION: 'LN_applyCoupon',
		link_id: PHY_STATE.link_id,
		user_id: $('#LB_UserID').val(),
		token: CSFR_TOKEN,
		code: PB_COUPON_STATE.code,
		variant_id: PHY_STATE.variant_id || 0,
		method_id: PHY_STATE.method_id || 0
	}, function(res) {
		if (!res.status) {
			let step3 = $('#PB_ShopModal').find('.PB_ShopStep3')
			let reason = (res.errors && res.errors[0]) || 'Coupon no longer applicable'
			let banner = 'Coupon ' + PB_COUPON_STATE.code + ' was removed because ' + reason.toLowerCase()
			PB_couponClear()
			$('#PB_ShopCouponBox3').removeClass('d-none')
			modalShowBuiltinErrors(step3, banner)
		}
	}, 'json')
})

function PHY_renderStep3() {
	$('#PB_ShopRecapTitle').text(PHY_STATE.product_title)
	let variant_title = ''
	for (let i = 0; i < PHY_STATE.variants.length; i++) {
		if (PHY_STATE.variants[i].variant_id === PHY_STATE.variant_id && !PHY_STATE.variants[i].is_default) {
			variant_title = PHY_STATE.variants[i].title
			break
		}
	}
	if (variant_title) {
		$('#PB_ShopRecapVariant').text(variant_title).removeClass('d-none')
	} else {
		$('#PB_ShopRecapVariant').addClass('d-none')
	}
	$('#PB_ShopMethods').empty()
	$('#PB_ShopRecapMethodInfo').addClass('d-none').empty()
	$('#PB_ShopRecapMethodWrap').addClass('d-none')
	if (PHY_STATE.methods.length === 1) {
		let m = PHY_STATE.methods[0]
		let $info = $('<span/>')
			.append($('<strong/>').text(m.name + ':'))
			.append(document.createTextNode(' ' + PHY_STATE.currency + ' ' + m.rate.toFixed(2)))
		$('#PB_ShopRecapMethodInfo').empty().append($info).removeClass('d-none')
	} else if (PHY_STATE.methods.length > 1) {
		PHY_STATE.methods.forEach(function(m, i) {
			let id = 'PB_ShopMethod_' + m.method_id
			let is_checked = m.method_id === PHY_STATE.method_id || (i === 0 && !PHY_STATE.method_id)
			let $input = $('<input/>').attr({ type: 'radio', name: 'pb_ship_method', id: id, value: m.method_id }).addClass('form-check-input m-0 flex-shrink-0')
			if (is_checked) { $input.prop('checked', true) }
			let $text = $('<span/>').addClass('flex-grow-1').text(m.name)
			let $price = $('<span/>').addClass('fw-semibold').text(PHY_STATE.currency + ' ' + m.rate.toFixed(2))
			let $row = $('<label/>').addClass('pb-ship-method-row').attr('for', id)
			if (is_checked) { $row.addClass('is-selected') }
			$row.append($input, $text, $price)
			$('#PB_ShopMethods').append($row)
		})
		$('#PB_ShopRecapMethodWrap').removeClass('d-none')
	}
	PHY_renderTotals()
}
function PHY_collectAddress() {
	let modal = $('#PB_ShopModal')
	return {
		name: (modal.find('[name="pbship_name"]').val() || '').trim(),
		email: (modal.find('[name="pbship_email"]').val() || '').trim(),
		line1: (modal.find('[name="pbship_line1"]').val() || '').trim(),
		line2: (modal.find('[name="pbship_line2"]').val() || '').trim(),
		city: (modal.find('[name="pbship_city"]').val() || '').trim(),
		state: (modal.find('[name="pbship_state"]').val() || '').trim(),
		postcode: (modal.find('[name="pbship_postcode"]').val() || '').trim(),
		country: (modal.find('[name="pbship_country"]').val() || '').trim(),
		phone: (modal.find('[name="pbship_phone"]').val() || '').trim()
	}
}
$(document).on('click', '#PB_ShopContinue2', function() {
	let step = $('#PB_ShopModal').find('.PB_ShopStep2')
	modalHideBuiltinErrors(step)
	$('#PB_ShopNoMethods').addClass('d-none')
	let addr = PHY_collectAddress()
	let missing = ['name','email','line1','city','postcode','country'].filter(function(k){ return !addr[k] })
	if (missing.length > 0) {
		stopLoadingButton()
		reEnableButton()
		modalShowBuiltinErrors(step, 'Please complete the shipping address')
		return
	}
	$.ajax({
		url: '/api/',
		method: 'POST',
		dataType: 'json',
		data: {
			ACTION: 'LN_getShippingMethods',
			link_id: PHY_STATE.link_id,
			user_id: $('#LB_UserID').val(),
			country: addr.country,
			token: CSFR_TOKEN
		},
		success: function (res) {
			stopLoadingButton()
			reEnableButton()
			if (!res.status) {
				modalShowBuiltinErrors(step, (res.errors && res.errors[0]) || 'Please try again')
				return
			}
			PHY_STATE.methods = res.info.methods || []
			if (PHY_STATE.methods.length === 0 || res.info.unsupported) {
				$('#PB_ShopNoMethods').removeClass('d-none')
				return
			}
			PHY_STATE.method_id = PHY_STATE.methods[0].method_id
			PHY_STATE.shipping_cost = PHY_STATE.methods[0].rate
			PHY_STATE.address = addr
			$('.PB_ShopStep').addClass('d-none')
			$('.PB_ShopStep3').removeClass('d-none')
			PHY_setTitle($('#PB_ShopHeaderTitle').data('step-checkout'))
			PHY_renderStep3()
			if (PHY_STATE.has_paypal) {
				payPalInitPhysical()
			}
			setTimeout(function () { checkShopModalHeight() }, 200)
		},
		error: function () {
			stopLoadingButton()
			reEnableButton()
			modalShowBuiltinErrors(step, 'Please try again')
		}
	})
})
function payPalInitPhysical() {
	$('#paypal-button-container-physical').empty()
	paypal.Buttons({
		style: { tagline: false, color: 'gold', label: 'pay', shape: 'pill' },
		createOrder: function (data, actions) { return actions.order.create(ORDER_INFO) },
		onApprove: function (data, actions) {
			return actions.order.capture().then(function (details) {
				location.href = '/shop/thank-you?type=p&pp-order-id=' + details.id
			})
		},
		onClick: function (data, actions) {
			let step3 = $('#PB_ShopModal').find('.PB_ShopStep3')
			modalHideBuiltinErrors(step3)
			$('#PB_ShopTermsError').addClass('d-none')
			let accept = $('#PB_ShopModal').find('input[name="accept_terms"]')
			if (!accept.is(':checked')) {
				$('#PB_ShopTermsError').removeClass('d-none')
				return false
			}
			return $.ajax({
				type: 'POST',
				url: '/api/',
				data: {
					ACTION: 'LN_createOrder',
					link_id: PHY_STATE.link_id,
					user_id: $('#LB_UserID').val(),
					token: CSFR_TOKEN,
					method: 'paypal',
					variant_id: PHY_STATE.variant_id,
					method_id: PHY_STATE.method_id,
					shipping_address: PHY_STATE.address,
					coupon_id: PB_COUPON_STATE.coupon_id || 0
				},
				dataType: 'json'
			}).then(function (res) {
				if (res.status) {
					ORDER_ID = res.info.order_id
					ORDER_INFO = res.info.pporder
					return actions.resolve()
				} else {
					modalShowBuiltinErrors(step3, (res.errors && res.errors[0]) || 'Could not create the order. Please refresh and try again.')
					return actions.reject()
				}
			}, function () {
				modalShowBuiltinErrors(step3, 'Could not reach the server. Please try again.')
				return actions.reject()
			})
		}
	}).render('#paypal-button-container-physical')
}
$(document).on('click', '#PB_ShopStripePhysical', function() {
	let step3 = $('#PB_ShopModal').find('.PB_ShopStep3')
	modalHideBuiltinErrors(step3)
	let accept = $('#PB_ShopModal').find('input[name="accept_terms"]')
	if (!accept.is(':checked')) {
		$('#PB_ShopTermsError').removeClass('d-none')
		stopLoadingButton()
		reEnableButton()
		return
	}
	$.getScript('https://js.stripe.com/v3/', function () {
		$.ajax({
			url: '/api/',
			method: 'POST',
			dataType: 'json',
			data: {
				ACTION: 'LN_createOrder',
				link_id: PHY_STATE.link_id,
				user_id: $('#LB_UserID').val(),
				token: CSFR_TOKEN,
				variant_id: PHY_STATE.variant_id,
				method_id: PHY_STATE.method_id,
				shipping_address: PHY_STATE.address,
				coupon_id: PB_COUPON_STATE.coupon_id || 0
			},
			success: function (res) {
				stopLoadingButton()
				reEnableButton()
				if (res.status) {
					let stripe = Stripe(_STRIPE_PK, { stripeAccount: res.info.stripe_account })
					stripe.redirectToCheckout({ sessionId: res.info.stripe_session.id })
				} else {
					modalShowBuiltinErrors(step3, (res.errors && res.errors[0]) || 'Could not create the order. Please refresh and try again.')
				}
			},
			error: function () {
				stopLoadingButton()
				reEnableButton()
				modalShowBuiltinErrors(step3, 'Could not reach the server. Please try again.')
			}
		})
	}).fail(function () {
		stopLoadingButton()
		reEnableButton()
		modalShowBuiltinErrors(step3, 'Could not load the payment library. Please try again.')
	})
})
ORDER_ID = 0
ORDER_INFO = {}
function payPalInit(res) {
	$('#paypal-button-container').empty()
	paypal.Buttons({
		style: {
			tagline: false,
			color: 'gold',
			label: 'pay',
			shape: 'pill',
			tagline: 'false'
		},
		createOrder: function (data, actions) {
			return actions.order.create(ORDER_INFO);
		},
		onInit: function (data, actions) { },
		onApprove: function (data, actions) {
			return actions.order.capture().then(function (details) {
				if (typeof (PP_REDIR) != "undefined") {
					location.href = PP_REDIR + "&pp-order-id=" + details.id
				} else {
					location.href = "/shop/thank-you?type=p&pp-order-id=" + details.id
				}
			});
		},
		onCancel: function (data) {
			$('.pr-loading-overlay').removeClass("d-block").addClass('d-none')
			$('.pr-loading-spinner').removeClass("d-block").addClass('d-none')
		},
		onClick: function (data, actions) {
			$('#PB_ShopTermsError').addClass("d-none")
			let accept = $('#PB_ShopModal').find('input[name="accept_terms"]')
			if (!accept.is(':checked')) {
				$('#PB_ShopTermsError').removeClass("d-none")
				return false
			}
			$('.pr-loading').removeClass("d-none").addClass("d-block")
			$('.payment-errors').addClass('d-none')
			$('.pr-loading-overlay').removeClass('d-none')
			$('.pr-loading-spinner').removeClass('d-none')
			return $.ajax({
				type: "POST",
				url: "/api/",
				data: {
					ACTION: 'LN_createOrder',
					link_id: res.link_id,
					user_id: $('#LB_UserID').val(),
					token: CSFR_TOKEN,
					method: 'paypal',
					coupon_id: PB_COUPON_STATE.coupon_id || 0
				},
				error: function () {
					location.reload()
					return actions.reject();
				},
				dataType: "json"
			}).then(function (res) {
				if (res.status) {
					ORDER_ID = res.info.order_id
					ORDER_INFO = res.info.pporder
					return actions.resolve();
				} else {
					$('.pr-loading-overlay').removeClass("d-block").addClass('d-none')
					$('.pr-loading-spinner').removeClass("d-block").addClass('d-none')
					$('.payment-errors').removeClass('d-none')
					$('.payment-errors').html(res.errors[0])
					return actions.reject();
				}
			})
		}

	}).render('#paypal-button-container');
}

$('#PB_ShopButton,.PB_ShopButton').on('click', function () {
	$('#PB_ShopTermsError').addClass("d-none")
	let accept = $('#PB_ShopModal').find('input[name="accept_terms"]')
	if (!accept.is(':checked')) {
		$('#PB_ShopTermsError').removeClass("d-none")
		stopLoadingButton()
		reEnableButton()
		setTimeout(function () {
			stopLoadingButton()
			reEnableButton()
		}, 200)
		return
	}
	var link_id = $('#PB_ShopButton').data('id')
	$.getScript('https://js.stripe.com/v3/', function () {
		$.ajax({
			url: "/api/",
			method: "POST",
			dataType: "json",
			data: {
				ACTION: 'LN_createOrder',
				link_id: link_id,
				user_id: $('#LB_UserID').val(),
				token: CSFR_TOKEN,
				coupon_id: PB_COUPON_STATE.coupon_id || 0
			},
			success: function (res) {
				stopLoadingButton()
				reEnableButton()
				if (res.status) {
					var stripe = Stripe(_STRIPE_PK, {
						stripeAccount: res.info.stripe_account
					});
					stripe.redirectToCheckout({
						sessionId: res.info.stripe_session.id
					}).then(function (result) { });
				}
			}
		});
	});
});

$('.modal').on('hide.bs.modal ', function () {
	$(this).addClass('faded')
	setTimeout(function () {
		$(this).removeClass('faded')
	}, 2000)
})

$('.modal').on('show.bs.modal  ', function () {
	$(this).removeClass('faded')
})

$(function () {
	let isMobile = window.matchMedia("only screen and (max-width: 760px)").matches;
	if (isMobile) {
		try {
			$(".modal:not(.modal-fullscreen)").swipe({
				swipeDown: function (event, direction, distance, duration, fingerCount, fingerData) {
					if ($(this).data('noslidedown')) {
						return;
					}
					$(this).modal('hide')
				},
				allowPageScroll: "vertical"
			});
		} catch (err) { }
	}
});

$('#PB_NewsletterSignupModal').on('show.bs.modal', function () {
	modalIsLoading($('#PB_NewsletterSignupModal'))
	$.ajax({
		url: "/api/",
		method: "POST",
		dataType: "json",
		data: {
			ACTION: 'NL_getNewsletterForm',
			user_id: $('#LB_UserID').val(),
			token: CSFR_TOKEN
		},
		success: function (res) {
			modalHasLoaded($('#PB_NewsletterSignupModal'));
			if (res.status) {
				$('#PB_NewsletterSignupModal').find('.loaded-container').html(res.info.html)
			}
		}
	});
})

$('#PB_NewsletterSignupModal,.newsletter-signup,#PB_ShowblockModal').on('submit', 'form[name="newsletter_signup"]', function (e) {
	e.preventDefault()
	let post = $(this).serializeObject()
	post.ACTION = 'NL_signup'
	post.user_id = $('#LB_UserID').val()
	post.token = CSFR_TOKEN
	let form = $(this)
	form.find('.alert').addClass('d-none')
	$.ajax({
		url: "/api/",
		method: "POST",
		dataType: "json",
		pass: { form: form },
		data: post,
		success: function (res) {
			stopLoadingButton()
			reEnableButton()
			let form = this.pass.form;
			if (res.status) {
				form.find('.alert-success').removeClass('d-none')
			} else {
				form.find('.alert-danger').removeClass('d-none')
				form.find('.alert-danger').html(res.errors[0])
			}
		}
	});
	return false;
});

$('#PB_ContactFormModal,.contactform,#PB_ShowblockModal').on('submit', 'form[name="contact_form"]', function (e) {
	e.preventDefault()
	let post = $(this).serializeObject()
	post.ACTION = 'NL_contact'
	post.user_id = $('#LB_UserID').val()
	post.token = CSFR_TOKEN
	if ($('#g-recaptcha-response').length && $('#g-recaptcha-response').val()) {
		post.captcha = $('#g-recaptcha-response').val()
	}
	let form = $(this)
	form.find('.alert').addClass('d-none')
	$.ajax({
		url: "/api/",
		method: "POST",
		dataType: "json",
		pass: { form: form },
		data: post,
		success: function (res) {
			stopLoadingButton()
			reEnableButton()
			let form = this.pass.form;
			if (res.status) {
				form.find('.alert-success').removeClass('d-none')
			} else {
				form.find('.alert-danger').removeClass('d-none')
				form.find('.alert-danger').html(res.errors[0])
			}
		}
	});
	return false;
});


$('#PB_ContactFormModal').on('show.bs.modal', function () {
	modalIsLoading($('#PB_ContactFormModal'))
	$.ajax({
		url: "/api/",
		method: "POST",
		dataType: "json",
		data: {
			ACTION: 'NL_getContactForm',
			user_id: $('#LB_UserID').val(),
			token: CSFR_TOKEN
		},
		success: function (res) {
			modalHasLoaded($('#PB_ContactFormModal'));
			if (res.status) {
				$('#PB_ContactFormModal').find('.loaded-container').html(res.info.html)
				if (res.info.captcha) {
					$('body').append("<script src='https://www.google.com/recaptcha/api.js'></script>");
				}
			}
		}
	});
})

$('#PB_ShareModal').on('show.bs.modal', function (e) {
	let btn = $(e.relatedTarget)
	if (btn.data('label')) {
		$('#PB_share_title').val(btn.data('label'))
	}
	if (navigator.share) {
		e.preventDefault()
		sendSecurity(btn)
		navigator.share({
			title: $('#PB_share_title').val(),
			url: $('#PB_share_link').val(),
		}).then(() => {
			e.preventDefault()
		}).catch();
	}
	modalIsLoading($('#PB_ShareModal'))
	$.ajax({
		url: "/api/",
		method: "POST",
		dataType: "json",
		data: {
			ACTION: 'PUB_getShareModal',
			user_id: $('#LB_UserID').val(),
			label: btn.data('label'),
			token: CSFR_TOKEN
		},
		success: function (res) {
			modalHasLoaded($('#PB_ShareModal'));
			if (res.status) {
				$('#PB_ShareModal').find('.loaded-container').html(res.info.html)
			}
		},
		error: function (xhr, desc, err) {
			modalHasLoaded($('#PB_ShareModal'));
		},
	});
})

$('#PUB_LnkPasswordModal').on('show.bs.modal', function (e) {
	let id = $(e.relatedTarget).data('id')
	$('#PUB_LnkPasswordModal').data('id', id)

	$('#PUB_LnkPasswordModal').find('.modal-running').removeClass('d-none')
	$('#PUB_LnkPasswordModal').find('.modal-completed').addClass('d-none')
})

$('#PUB_LnkPasswordForm').on('submit', function (e) {
	e.preventDefault();
	modalHideErrors($('#PUB_LnkPasswordModal'))
	let button = $('#PUB_LnkPasswordSubmit')
	LOADING_BUTTON = button
	DISABLING_BUTTON = button
	button.find('.spinner-grow').remove()
	button.append('<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>')
	button.attr("disabled", "disabled")

	$.ajax({
		type: "POST",
		url: "/api/",
		dataType: "json",
		data: {
			ACTION: "PUB_checkLnkPassword",
			password: $('#PUB_LnkPassword').val(),
			user_id: $('#LB_UserID').val(),
			link_id: $('#PUB_LnkPasswordModal').data('id'),
			token: CSFR_TOKEN
		},
		success: function (res) {
			stopLoadingButton()
			reEnableButton()
			if (res.status) {
				$('#PUB_LnkPasswordModal').find('.modal-running').addClass('d-none')
				$('#PUB_LnkPasswordModal').find('.modal-completed').removeClass('d-none')
				location.href = res.info.redir
			} else {
				modalShowErrors($('#PUB_LnkPasswordModal'), res.errors[0])
			}
		}
	})
})

$('.group-title-collapse-toggle').on('click', function () {
	let group_info = $(this).attr("class").match(/group-container-([0-9]+)/);
	if (!group_info || group_info.length < 2 || !group_info[1]) {
		return
	}
	let group_id = group_info[1]
	if ($('.pb-links.group-container-' + group_id).hasClass('d-none')) {
		$('.pb-links.group-container-' + group_id).removeClass('d-none')
		$('.group-container-' + group_id).find('.group-toggler-icon').removeClass('fa-chevron-down').addClass('fa-chevron-up')
		refreshImages()
		footerPositionUpdate()
	} else {
		$('.pb-links.group-container-' + group_id).addClass('d-none')
		$('.group-container-' + group_id).find('.group-toggler-icon').removeClass('fa-chevron-up').addClass('fa-chevron-down')
		footerPositionUpdate()
	}
	try {
		$('.public-container').slick('setPosition');
	} catch (e) {

	}
})

$('.group-title-collapse-toggle-single').on('click', function () {
	let group = $(this).next()
	if (!group.hasClass('group-title-collapse-single-container')) {
		return
	}
	
	if (group.hasClass('d-none')) {
		group.removeClass('d-none')
		group.find('.pb-links').removeClass('d-none')
		$(this).find('.group-toggler-icon').removeClass('fa-chevron-down').addClass('fa-chevron-up')
		refreshImages()
		footerPositionUpdate()
	} else {
		group.addClass('d-none')
		$(this).find('.group-toggler-icon').removeClass('fa-chevron-up').addClass('fa-chevron-down')
		footerPositionUpdate()
	}
	try {
		$('.public-container').slick('setPosition');
	} catch (e) {

	}
})

if (location.href.toString().toLowerCase() != 'https://lnk.bio/tiktokuser1907' && location.href.toString().toLowerCase() != 'https://lnk.bio/madison' && false) {
	$.ajax({
		type: "POST",
		url: "/api/",
		dataType: "json",
		data: {
			ACTION: "PUB_ping",
			page: location.href.toString(),
			title: document.title
		}
	})
}

$('.LB_countdown').each(function () {
	let date = $(this).data('date')
	let div = $(this);
	x = setInterval(function () {
		LB_Countdown(date, div)
	}, 1000)
})

$('form[name="public-search-form"]').on('submit', function (e) {
	e.preventDefault()
	let inp = $(this).find('input.public-search-input')
	if (!inp.val()) {
		return
	}
	$('#PUB_LnkSearchModal').data('search', inp.val())
	$('#PUB_LnkSearchModal').modal('show')
})

$('#PUB_LnkSearchModal').on('submit', 'form[name="public-search-form"]', function (e) {
	e.preventDefault()
	let inp = $(this).find('input.public-search-input')
	if (!inp.val()) {
		return
	}
	$('#PUB_LnkSearchModal').data('search', inp.val())
	initLnkSearch()
})

$('#PUB_LnkSearchModal').on('show.bs.modal', function () {
	initLnkSearch()
})

function initLnkSearch() {
	modalIsLoading($('#PUB_LnkSearchModal'))
	let search_val = $('#PUB_LnkSearchModal').data('search');
	if (!search_val) {
		$('#PUB_LnkSearchModal').modal('hide')
	}
	if (typeof (NONCE) == "undefined") {
		NONCE = ""
	}
	if (typeof (NONCE_TIME) == "undefined") {
		NONCE_TIME = 0
	}
	$.ajax({
		url: "/api/",
		method: "POST",
		dataType: "json",
		data: {
			ACTION: 'PUB_search',
			nonce: NONCE,
			nonce_time: NONCE_TIME,
			user_id: $('#LB_UserID').val(),
			search: search_val,
			token: CSFR_TOKEN
		},
		success: function (res) {
			if (res.status) {
				modalHasLoaded($('#PUB_LnkSearchModal'))
				$('#PUB_LnkSearchModal').find('input.public-search-input').val(res.info.search)
				let txt = ''
				for (const key in res.info.links) {
					if (Object.hasOwnProperty.call(res.info.links, key)) {
						const element = res.info.links[key].join(' ')
						txt += element
					}
				}
				$('#PUB_LnkSearchModal').find('.search-results').html(txt)
				refreshImages()
			}
		}
	});
}
$('#PUB_LnkSearchModal').on('scroll', function () {
	refreshImages()
});
$('#PUB_LnkSearchModal').find('.modal-body').on('scroll', function () {
	refreshImages()
});



function checkTagsModalHeight() {
	if ((window.innerHeight - 50) < $('#PUB_LnkMultiModal').find('.modal-dialog').height()) {
		$('#PUB_LnkMultiModal').addClass('modal-fullscreen')
		$('#PUB_LnkMultiModal').find('.modal-header').addClass('modal-header-fullscreen')
		$('#PUB_LnkMultiModal').data('noslidedown', true);
	} else {
		$('#PUB_LnkMultiModal').removeClass('modal-fullscreen')
		$('#PUB_LnkMultiModal').find('.modal-header').removeClass('modal-header-fullscreen')
		$('#PUB_LnkMultiModal').data('noslidedown', false);
	}
}

$('#PUB_LnkMultiModal').find('.tag-img-container img').on('load', function () {
	setTimeout(function () { checkTagsModalHeight() }, 500)

})

$('#PUB_LnkMultiModal').on('show.bs.modal', function (e) {
	checkTagsModalHeight()
	modalIsLoading($('#PUB_LnkMultiModal'))
	let link = $(e.relatedTarget)
	$.ajax({
		url: "/api/",
		method: "POST",
		dataType: "json",
		data: {
			ACTION: 'PUB_getTag',
			nonce: NONCE,
			nonce_time: NONCE_TIME,
			user_id: $('#LB_UserID').val(),
			link_id: link.data('id'),
			token: CSFR_TOKEN
		},
		success: function (res) {
			if (res.status) {
				modalHasLoaded($('#PUB_LnkMultiModal'))
				$('#PUB_LnkMultiModal').find('.tag-img-container div').remove()
				$('#PUB_LnkMultiModal').find('.tag-img-container').append(res.info.tags)
				$('#PUB_LnkMultiModal').find('.tag-img-container img').attr('src', res.info.img)
				$('#PUB_LnkMultiModal').find('.tag-links-container').html(res.info.buttons)
				checkTagsModalHeight()
			}
		}
	});
})

function checkCarouselModalHeight() {
	if ((window.innerHeight - 50) < $('#PUB_LnkCarouselModal').find('.modal-dialog').height()) {
		$('#PUB_LnkCarouselModal').addClass('modal-fullscreen')
		$('#PUB_LnkCarouselModal').find('.modal-header').addClass('modal-header-fullscreen')
		$('#PUB_LnkCarouselModal').data('noslidedown', true);
	} else {
		$('#PUB_LnkCarouselModal').removeClass('modal-fullscreen')
		$('#PUB_LnkCarouselModal').find('.modal-header').removeClass('modal-header-fullscreen')
		$('#PUB_LnkCarouselModal').data('noslidedown', false);
	}
}

$('#PUB_LnkCarouselModal').on('show.bs.modal', function (e) {
	checkCarouselModalHeight()
	modalIsLoading($('#PUB_LnkCarouselModal'))
	let link = $(e.relatedTarget)
	$.ajax({
		url: "/api/",
		method: "POST",
		dataType: "json",
		data: {
			ACTION: 'PUB_getCarousel',
			nonce: NONCE,
			nonce_time: NONCE_TIME,
			user_id: $('#LB_UserID').val(),
			link_id: link.data('id'),
			token: CSFR_TOKEN
		},
		success: function (res) {
			if (res.status) {
				checkCarouselModalHeight()
				$('#PUB_LnkCarouselModal').find('.modal-title').text(res.info.title)
				$('#PUB_LnkCarouselModal').find('.loaded-container').html(res.info.html)
				modalHasLoaded($('#PUB_LnkCarouselModal'))
				$('.lnk-carousel-container').slick({
					dots: true,
					autoplay: false,
					arrows: true,
					initialSlide: 0,
					prevArrow: "<button type=\"button\" class=\"slick-prev pull-left\"><i class=\"fas fa-chevron-left\" aria-hidden=\"true\"></i></button>",
					nextArrow: "<button type=\"button\" class=\"slick-next pull-right\"><i class=\"fas fa-chevron-right\" aria-hidden=\"true\"></i></button>"
				});
				setTimeout(function () { checkCarouselModalHeight() }, 700)
			}
		}
	});
})

$('form[name="page_password"]').on('submit', function (e) {
	$(this).find('.password-errors').addClass('d-none')
	e.preventDefault()
	let data = $(this).serializeObject()
	data['ACTION'] = 'PUB_unlockPage'
	data['user_id'] = $('#LB_UserID').val()
	$.ajax({
		url: "/api/",
		method: "POST",
		dataType: "json",
		source_form: $(this),
		data: data,
		success: function (res) {
			this.source_form.find('.password-errors').addClass('d-none')
			stopLoadingButton()
			reEnableButton()
			if (res.status) {
				$('#page_replace_' + res.info.page_id).replaceWith(res.info.html)
				refreshImages()
				setTimeout(function() {
					$('iframe').trigger('resize')
					try {
						$('.public-container').slick('setPosition');
					} catch (e) {

					}
				}, 500)
				try {
					$('.public-container').slick('setPosition');
				} catch (e) {

				}
			} else {
				this.source_form.find('.password-errors').removeClass('d-none')
				this.source_form.find('.password-errors').text(res.errors[0])
			}
			try {
				$('.public-container').slick('setPosition');
			} catch (e) {

			}
		}
	});
})

$('#PUB_reviewFormModal').on('show.bs.modal', function () {
	$('#PUB_reviewFormModal').find('input:not([type="checkbox"])').val('')
	$('#PUB_reviewFormModal').find('.reviews_outcome').addClass('d-none')
	$('#PUB_reviewFormModal').find('.reviews_form_container').removeClass('d-none')
	$(this).find('.review_stars_rate').each(function () {
		$(this).removeClass('fas').addClass('far')
	})
})

$('.review_stars_rate').on('click', function () {
	let parent = $(this).parent()
	let score = $(this).data('score')
	$('#PUB_reviewFormModal').find('input[name="score"]').val(score)
	parent.find('.review_stars_rate').each(function () {
		if ($(this).data('score') <= score) {
			$(this).removeClass('far').addClass('fas')
		} else {
			$(this).removeClass('fas').addClass('far')
		}
	})
})
$('#PUB_reviewFormModal').on('show.bs.modal', function () {
	$('#PUB_reviewFormModal').find('input:not([type="checkbox"]),textarea').val('')
})
$('#PUB_reviewFormForm').on('submit', function (e) {
	e.preventDefault()
	$('#PUB_reviewFormForm').find('.modal-errors-builtin').addClass('d-none')
	let data = $(this).serializeObject()
	data['ACTION'] = 'PUB_submitReview'
	data['user_id'] = $('#LB_UserID').val()
	if (typeof (NONCE) == "undefined") {
		NONCE = ""
	}
	if (typeof (NONCE_TIME) == "undefined") {
		NONCE_TIME = 0
	}
	data['nonce'] = NONCE
	data['nonce_time'] = NONCE_TIME
	$.ajax({
		url: "/api/",
		method: "POST",
		dataType: "json",
		data: data,
		success: function (res) {
			stopLoadingButton()
			reEnableButton()
			if (res.status) {
				$('#PUB_reviewFormModal').find('.reviews_form_container').addClass('d-none')
				$('#PUB_reviewFormModal').find('.reviews_outcome').removeClass('d-none')
			} else {
				$('#PUB_reviewFormForm').find('.modal-errors-builtin').removeClass('d-none')
				$('#PUB_reviewFormForm').find('.modal-errors-builtin').html(res.errors[0])
			}
		}
	});
})

$(window).on('load', function () {
	let observer;
	function allImagesLoaded() {
		try {
			let images = $('.pb-linkimage img');
			let unloadedImages = images.toArray().filter(img => !img.complete || img.naturalHeight === 0);

			if (unloadedImages.length === 0) {
				stopLoading();
				if (observer) observer.disconnect(); 
			}
		} catch (e) {}
    }

    function stopLoading() {
        if (typeof (NO_CANCEL_LOADING) == 'undefined' || !NO_CANCEL_LOADING) {
            $('.loading-container').each(function() {
                let parent = $(this).closest('.modal-content');
                if (!parent.hasClass('NO_CANCEL_LOADING')) {
                    $(this).remove();
                }
            });
            $('.loading-indicator').remove();
            $('.loading-style').remove();

			try {
				$('.public-container').slick('setPosition');
			} catch (e) {

			}
        }
    }

    function onImageLoad() {
        allImagesLoaded();
    }

    $('.pb-linkimage img').each(function () {
		try {
			if (!this.complete || this.naturalHeight === 0) {
				$(this).on('load error', onImageLoad);
			}
		} catch(e) {}
    });

	try {
		observer = new MutationObserver(() => {
			$('.pb-linkimage img').each(function () {
				if (!this.complete || this.naturalHeight === 0) {
					$(this).on('load error', onImageLoad);
				}
			});
		});

		$('.pb-linkimage').each(function () {
			observer.observe(this, { childList: true, subtree: true });
		});
	} catch(e) {}

    allImagesLoaded();
	setTimeout(function() {
        stopLoading();
    }, 3000);
});

try {
	if ( $('#LB_UserID').val() == '-2128920' && typeof('fbq') != "undefined") {
		$('a.pb-linkbox').on('click', function() {
			let url = $(this).attr('href');
			const params = new URLSearchParams(url.split('?')[1]);
			const encodedD = params.get('d');
			const decodedD = decodeURIComponent(encodedD);

			fbq('trackCustom', 'linkClick', {
				title: $(this).attr('title'),
				destination: decodedD
			});
			return true;
		});
	}
} catch (Ex){
	
}

$('body').on('click', 'a[data-click="true"]', function(e){
	sendSecurity($(this))
})

function sendSecurity(el) {
	let data = new URLSearchParams(el.data()).toString();
	let url = '/security_click.json?'+data
	if (typeof navigator.sendBeacon === 'function') {
		navigator.sendBeacon(url, '');
		return
	} 
	$.ajax({url: url,method: "GET"});
}

function checkCookieConsentCached() {
	$.ajax({
		url: "/api/",
		method: "POST",
		dataType: "json",
		data: {
			ACTION: 'PUB_cookieConsentGet',
			user_id: $('#LB_UserID').val(),
			token: CSFR_TOKEN
		},
		success: function (res) {
			if (res.status) {
				if (res.info.consent == "NULL") {
					$('#pb_cookie_consent').removeClass('d-none')
				} else {
					$('#pb_cookie_consent').addClass('d-none')
					if (res.info.consent == "TRUE") {
						printTrackingCodes()
					}
				}
			}
		}
	});
}

const dropdown = document.getElementById('langDropdown');
if (dropdown) {
	const toggleBtn = dropdown.querySelector('.lang-dropdown-toggle');

	toggleBtn.addEventListener('click', () => {
		dropdown.classList.toggle('open');
	});

	// Close dropdown if clicking outside
	document.addEventListener('click', (e) => {
	if (!dropdown.contains(e.target)) {
		dropdown.classList.remove('open');
	}
	});

	$('.languageDropdownSelect').on('click', function(){
		let lang = $(this).data('lang')
		const url = new URL(window.location.href);
		url.searchParams.set('sc', lang);
		window.location.href = url.toString();
	})
}

$('.closeBrowserModal').on('click', function() {
	$('#openBrowserModal').addClass('d-none')
})

$('#openBrowserModal').on('click', function(e) {
  if (e.target === this) {
    $(this).addClass('d-none');
  }
});


$(function () {
    $(document).on('click', '[data-bs-toggle="popover"].custompop', function (e) {
      e.preventDefault();
      e.stopPropagation(); 
    });

    $(document).on('click', function (e) {
      $('[data-bs-toggle="popover"].custompop').each(function () {
        if (!$(this).is(e.target) && $(this).has(e.target).length === 0 && $('.popover').has(e.target).length === 0) {
          $(this).popover('hide');
        }
      });
    });
  });

$('.opening_times_toggler').on('click', function() {
	let container = $(this)
	let icon = container.find('.opening_times_icon').find('i')
	let times = container.find('.opening_times_container')
	if (times.hasClass('d-none')) {
		times.removeClass('d-none')
		icon.removeClass('fa-chevron-down').addClass('fa-chevron-up')
	} else {
		times.addClass('d-none')
		icon.removeClass('fa-chevron-up').addClass('fa-chevron-down')
	}
	footerPositionUpdate()
})

if (Intl.DateTimeFormat(navigator.language,  { hour: 'numeric' }).resolvedOptions().hourCycle == "h12")  {
	is12HourTime = true
} else {
	is12HourTime = false
}
const is_12hour = is12HourTime
$('.timezone-converted').each(function() {
	if (is_12hour) {
		$(this).html($(this).data('12'))
	} else {
		$(this).html($(this).data('24'))
	}
})

$('#PB_ShowblockModal').on('show.bs.modal', function (e) {
	let modal = $(this)
	checkGenericModalHeight(modal)
	let lnk = $(e.relatedTarget)
	let title = lnk.find('.pb-linktitle').text()
	$.ajax({
		url: "/api/",
		method: "POST",
		dataType: "json",
		data: {
			ACTION: 'PUB_getBlockModal',
			user_id: $('#LB_UserID').val(),
			block_id: lnk.data('blockid'),
			token: CSFR_TOKEN
		},
		success: function (res) {
			if (res.status) {
				injectHtmlWithScripts(modal.find('.loaded-container'), res.info.html);
				modal.find('.modal-title').text(title)
				if (res.info.type == 'BLOCK_CALENDAR') {
					try {
						modal.modal('hide')
						setTimeout(function() {modal.modal('hide')}, 500)
						let id = modal.find('.CAL_Calendar').data('id')
						$('#PB_CalendarModal').modal('show')
						CAL_openCalendar(id)
						return
					} catch {}
				}
				if (res.info.type == 'BLOCK_FORM') {
					modal.find('h5.modal-title').addClass('d-none')
					modal.find('.modal-header').removeClass('pt-4_5').addClass('pt-2')
					if (res.info.html.indexOf('g-recaptcha') != -1) {
						if (typeof(grecaptcha) == 'undefined') {
							$.getScript('https://www.google.com/recaptcha/api.js?render=explicit', function() {
							});
						}
					}
				} else {
					modal.find('h5.modal-title').removeClass('d-none')
					modal.find('.modal-header').removeClass('pt-2').addClass('pt-4_5')
				}
				checkGenericModalHeight(modal)
				attachModalAutoHeight(modal);
			}
			modalHasLoaded(modal);
		},
		error: function (xhr, desc, err) {
			modalHasLoaded(modal);
			modal.modal('hide')
		},
	});
});

$('#PB_GenericFormModal').on('show.bs.modal', function (e) {
	let modal = $(this)
	checkGenericModalHeight(modal)
	let lnk = $(e.relatedTarget)
	let form_id = lnk.data('formid')
	$.ajax({
		url: "/api/",
		method: "POST",
		dataType: "json",
		data: {
			ACTION: 'PUB_getFormModal',
			user_id: $('#LB_UserID').val(),
			form_id: form_id,
			token: CSFR_TOKEN
		},
		success: function (res) {
			if (res.status) {
				modal.find('.loaded-container').html(res.info.html)
				modal.find('h5.modal-title').addClass('d-none')
				modal.find('.modal-header').removeClass('pt-4_5').addClass('pt-2')
				checkGenericModalHeight(modal)
				attachModalAutoHeight(modal);
			}
			modalHasLoaded(modal);
		},
		error: function (xhr, desc, err) {
			modalHasLoaded(modal);
			modal.modal('hide')
		},
	});
});

function injectHtmlWithScripts($container, html) {
  // 1. Let the browser parse the HTML and build the full DOM tree
  $container.html(html);

  // 2. Find ALL <script> elements inside (any depth)
  $container.find('script').each(function () {
    var oldScript = this;
    var newScript = document.createElement('script');

    // Copy all attributes (src, type, async, etc.)
    for (var i = 0; i < oldScript.attributes.length; i++) {
      var attr = oldScript.attributes[i];
      newScript.setAttribute(attr.name, attr.value);
    }

    // Copy inline script content, if any
    if (oldScript.text || oldScript.textContent) {
      newScript.appendChild(document.createTextNode(oldScript.text || oldScript.textContent));
    }

    // Replace the old <script> with the new one (this triggers execution)
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
}

$('.nav-btn-menu').on('click', function(e){
	e.preventDefault()
	let id = $(this).data('pageid')
	if ($('.public-container').hasClass('slick-initialized')) {
		let index = $('.public-container').find('.slick-slide[data-page-id="' + id + '"]').data('slick-index');
		if (index !== undefined) {
			$('.public-container').slick('slickGoTo', index);
		}
	} else {
		let slide = $(this).data('slide')
		if (slide) {
			try {
				history.pushState(null, "", slide);
			} catch (Exception) {}
		}
		$('.public-container-inner').addClass('d-none')
		$('.public-container-inner[data-page-id="'+id+'"]').removeClass('d-none')
		$.ajax({
			url: "/api/",
			method: "POST",
			dataType: "json",
			data: {
				ACTION: 'PUB_swipe',
				page_id: id,
				user_id: $('#LB_UserID').val(),
				token: CSFR_TOKEN
			},
			success: function (res) {
			}
		});
	}
	var menu = document.getElementById('userNavigation');
	var collapse = bootstrap.Collapse.getOrCreateInstance(menu);
	collapse.hide();
	$('#userNavigation').find('a.nav-btn-menu').removeClass('op-80').addClass('c-pointer')
	$('#userNavigation').find('a.nav-btn-menu[data-pageid="'+id+'"]').addClass('op-80').removeClass('c-pointer')
	CURRENT_PAGE_MENU = id;
})



$('#PB_ShowblockModal').on('click', '.CAL_openCalendar', function() {
	let cal_id = $(this).data('id')
	if (!cal_id) {
		return
	}
	$('#PB_ShowblockModal').modal('hide')
	setTimeout(function() {$('#PB_ShowblockModal').modal('hide')}, 500)
	CAL_openCalendar(cal_id)
})

$('#NL_ImpressumModal').on('shown.bs.modal', function (e) {
	checkGenericModalHeight($(this))
});

function attachModalAutoHeight($modal) {
	const $content = $modal.find('.loaded-container');
	if (!$content.length) return;

	// Clean up old observer / interval if any
	const oldObserver = $modal.data('resizeObserver');
	if (oldObserver) {
		oldObserver.disconnect();
	}

	const oldInterval = $modal.data('heightInterval');
	if (oldInterval) {
		clearInterval(oldInterval);
	}

	// --- Preferred: ResizeObserver (modern browsers) ---
	if (window.ResizeObserver) {
		const ro = new ResizeObserver(function () {
			checkGenericModalHeight($modal);
		});
		ro.observe($content[0]);
		$modal.data('resizeObserver', ro);
	} else {
		// --- Fallback: simple polling ---
		let lastHeight = $content.outerHeight();
		const intervalId = setInterval(function () {
			const h = $content.outerHeight();
			if (h !== lastHeight) {
				lastHeight = h;
				checkGenericModalHeight($modal);
			}
		}, 300);
		$modal.data('heightInterval', intervalId);
	}

	// Extra: react when existing iframes/images finish loading
	$content.find('iframe, img').each(function () {
		$(this).one('load', function () {
			checkGenericModalHeight($modal);
		});
	});

	// Cleanup when modal hidden
	$modal.one('hidden.bs.modal', function () {
		const ro = $modal.data('resizeObserver');
		if (ro) ro.disconnect();

		const intId = $modal.data('heightInterval');
		if (intId) clearInterval(intId);

		$modal.removeData('resizeObserver');
		$modal.removeData('heightInterval');
	});
}

$('form.form-public-submission').on('submit', function(e){
	e.preventDefault()
	submitPublicForm($(this))
})

$('#PB_ShowblockModal,#PB_GenericFormModal').on('submit', 'form.form-public-submission', function(e){
	e.preventDefault()
	submitPublicForm($(this))
})

function submitPublicForm(form) {
	modalHideBuiltinErrors(form)
	formHideSuccess(form)
	let data = form.serializeObject()
	let captcha_id = ''
	data.user_id = $('#LB_UserID').val()
	try {
		let form_id = form.attr('id')
		captcha_id = CAPTCHAS[form_id]
		if (captcha_id !== undefined && typeof(grecaptcha) != "undefined") {
			data.captcha = grecaptcha.getResponse(captcha_id)
		}
	} catch (ex) {}
	let button = form.find('button[type="submit"]')
	LOADING_BUTTON = button
	DISABLING_BUTTON = button
	button.find('.spinner-grow').remove()
	button.append('<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>')
	button.attr("disabled", "disabled")
	
	$.ajax({
		url: "/api/",
		method: "POST",
		dataType: "json",
		data: {
			DOMAIN: 'PublicUser',
			METHOD: 'submitForm',
			DATA: data,
			token: CSFR_TOKEN
		},
		success: function (res) {
			stopLoadingButton()
			reEnableButton()
			if (!res.status) {
				modalShowBuiltinErrors(form, res.errors[0])
				return
			}
			formShowSuccess(form, res.info.success)
			try {
				form[0].reset()
				grecaptcha.reset(captcha_id);
			} catch(Exception) {}
		},
		error: function (xhr, desc, err) {
			stopLoadingButton()
			reEnableButton()
			modalShowBuiltinErrors(form, 'Generic error. Refresh and try again')
		},
	});
}

const CAPTCHAS = {};
function renderAllRecaptchas() {
  $('.g-recaptcha').each(function () {
    var $el = $(this);
    var elId = $el.attr('id');
	var formId = $el.closest('form').attr('id')
    if (!elId) {
      return;
    }
    if (CAPTCHAS[formId] !== undefined) {
      return;
    }
    var sitekey = $el.data('sitekey');
    CAPTCHAS[formId] = grecaptcha.render(elId, {
      sitekey: sitekey
    });
  });
}
(function waitForRecaptcha() {
  if (window.grecaptcha && $.isFunction(grecaptcha.render)) {
    renderAllRecaptchas();
  } else {
    setTimeout(waitForRecaptcha, 50);
  }
})();