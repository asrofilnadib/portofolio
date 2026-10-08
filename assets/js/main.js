/*-----------------------------------------------------------------------------------

Theme Name: Gerold - Personal Portfolio HTML5 Template
Theme URI: https://themejunction.net/html/gerold/demo/
Author: Theme-Junction
Author URI: https://themeforest.net/user/theme-junction
Description: Gerold - Personal Portfolio HTML5 Template

-----------------------------------------------------------------------------------

/***************************************************
==================== JS INDEX ======================
****************************************************
// Data js
// Sidebar Navigation
// Sticky Header
// Hamburger Menu
// Scroll To Section
// OnePage Active Class
// Portfolio Filter
// Portfolio Gallery Carousel
// Testimonial Carousel
// Nice Select
// ALL Popup
// Preloader
// Sidebar Hover BG Color
// Services Hover BG
// Portfolio Filter BG Color
// Funfact
// WoW Js

****************************************************/

(function ($) {
	"use strict";

	/*------------------------------------------------------
  /  Data js
  /------------------------------------------------------*/
	$("[data-bg-image]").each(function () {
		$(this).css(
			"background-image",
			"url(" + $(this).attr("data-bg-image") + ")"
		);
	});

	$("[data-bg-color]").each(function () {
		$(this).css("background-color", $(this).attr("data-bg-color"));
	});

	$(document).ready(function ($) {

		/*------------------------------------------------------
  	/  Sticky Header
  	/------------------------------------------------------*/
	var lastScrollTop = 0;
	$(window).scroll(function () {
		var scroll = $(window).scrollTop();

		if (scroll > 300) {
			$(".tj-header-area.header-sticky").addClass("sticky");
			$(".tj-header-area.header-sticky").removeClass("sticky-out");
		} else if (scroll < lastScrollTop) {
			if (scroll < 500) {
				$(".tj-header-area.header-sticky").addClass("sticky-out");
				$(".tj-header-area.header-sticky").removeClass("sticky");
			}
		} else {
			$(".tj-header-area.header-sticky").removeClass("sticky");
		}

		lastScrollTop = scroll;
	});
		

		/*------------------------------------------------------
  	/  Hamburger Menu
  	/------------------------------------------------------*/
		$(".menu-bar").on("click", function () {
			$(".menu-bar").toggleClass("menu-bar-toggeled");
			$(".header-menu").toggleClass("opened");
			$("body").toggleClass("overflow-hidden");
		});

		$(".header-menu ul li a").on("click", function () {
			$(".menu-bar").removeClass("menu-bar-toggeled");
			$(".header-menu").removeClass("opened");
			$("body").removeClass("overflow-hidden");
		});

		/*------------------------------------------------------
  	/  OnePage Active Class
  	/------------------------------------------------------*/
		function onPageNav(switchName) {
			const navSwitch = $(switchName);
			const deductHeight = 60;
			let navArr = [];

			navSwitch.each(function (i) {
				let navSwitchHref = $(this).attr("href");
				let tgtOff = $(navSwitchHref).offset().top - deductHeight;
				navArr.push([]);
				navArr[i].switch = $(this);
				navArr[i].tgtOff = tgtOff;
			});
			//        console.log(navArr);
			$(window).scroll(function () {
				for (let i = 0; i < navArr.length; i++) {
					let scroll = $(window).scrollTop();
					let tgtKey = navArr[i];
					let tgtSwitch = tgtKey.switch;
					let tgtOff = tgtKey.tgtOff;
					if (scroll >= tgtOff) {
						navSwitch.parent().removeClass("is-current");
						tgtSwitch.parent().addClass("is-current");
					} else {
						tgtSwitch.parent().removeClass("is-current");
					}
				}
			});
		}
		$(window).on("load resize", function () {
			onPageNav(".side-navbar a");
		});

		$(".header-menu nav ul").onePageNav({
			currentClass: "current-menu-ancestor",
			changeHash: false,
			easing: "swing",
		});

		/*------------------------------------------------------
  	/  Portfolio Filter
  	/------------------------------------------------------*/
		var $grid = $(".portfolio-box").isotope({
			// options
			masonry: {
				columnWidth: ".portfolio-box .portfolio-sizer",
				gutter: ".portfolio-box .gutter-sizer",
			},
			itemSelector: ".portfolio-box .portfolio-item",
			percentPosition: true,
		});

		var $portfolioShowcase = $(".portfolio-showcase");
		var $portfolioExpand = $(".portfolio-expand");
		var portfolioVisibleCount = 0;
		var portfolioExpandLocked = false;
		var PORTFOLIO_INITIAL_ROWS = 2;
		var PORTFOLIO_EXPAND_ROWS = 1;

		function getPortfolioItemsPerRow() {
			return window.matchMedia("(max-width: 991px)").matches ? 1 : 2;
		}

		function getFilteredPortfolioItems() {
			return $grid.isotope("getFilteredItemElements") || [];
		}

		function measurePortfolioHeightForCount(itemCount) {
			var filtered = getFilteredPortfolioItems();
			var total = filtered.length;
			if (!total) {
				return null;
			}

			var visible = Math.min(Math.max(itemCount, 1), total);
			var targetItem = filtered[visible - 1];
			if (!targetItem) {
				return null;
			}

			var gridTop = $grid[0].getBoundingClientRect().top + window.scrollY;
			var itemBottom =
				targetItem.getBoundingClientRect().top +
				window.scrollY +
				targetItem.offsetHeight;
			var peek = visible < total ? 80 : 0;
			var height = Math.max(itemBottom - gridTop + peek, 420);

			return {
				visible: visible,
				total: total,
				height: height,
				isComplete: visible >= total,
			};
		}

		function applyPortfolioCollapsedHeight(itemCount) {
			if (!$portfolioShowcase.length) {
				return;
			}

			var measured = measurePortfolioHeightForCount(itemCount);
			if (!measured) {
				return;
			}

			portfolioVisibleCount = measured.visible;

			if (measured.total <= getPortfolioItemsPerRow() * PORTFOLIO_INITIAL_ROWS) {
				$portfolioShowcase
					.removeClass("is-collapsed")
					.addClass("is-fully-expanded")
					.css("max-height", "");
				$portfolioExpand.attr("aria-expanded", "true");
				return;
			}

			if (measured.isComplete) {
				$portfolioShowcase
					.removeClass("is-collapsed")
					.addClass("is-fully-expanded")
					.css("max-height", "");
				$portfolioExpand.attr("aria-expanded", "true");
				return;
			}

			$portfolioShowcase
				.addClass("is-collapsed")
				.removeClass("is-fully-expanded")
				.css({
					"--portfolio-collapsed-height": measured.height + "px",
					"max-height": measured.height + "px",
				});
			$portfolioExpand.attr("aria-expanded", "false");
		}

		function resetPortfolioCollapse() {
			portfolioVisibleCount = getPortfolioItemsPerRow() * PORTFOLIO_INITIAL_ROWS;
			applyPortfolioCollapsedHeight(portfolioVisibleCount);
		}

		function syncPortfolioCollapseAfterLayout() {
			if (portfolioExpandLocked || $portfolioShowcase.hasClass("is-fully-expanded")) {
				return;
			}
			applyPortfolioCollapsedHeight(
				portfolioVisibleCount || getPortfolioItemsPerRow() * PORTFOLIO_INITIAL_ROWS
			);
		}

		$grid.on("arrangeComplete", function () {
			syncPortfolioCollapseAfterLayout();
		});

		$portfolioExpand.on("click", function () {
			var filtered = getFilteredPortfolioItems();
			var total = filtered.length;
			if (!total || $portfolioShowcase.hasClass("is-fully-expanded")) {
				return;
			}

			var perRow = getPortfolioItemsPerRow();
			var nextCount =
				(portfolioVisibleCount || perRow * PORTFOLIO_INITIAL_ROWS) +
				perRow * PORTFOLIO_EXPAND_ROWS;

			portfolioExpandLocked = true;
			applyPortfolioCollapsedHeight(nextCount);

			window.setTimeout(function () {
				portfolioExpandLocked = false;
				$grid.isotope("layout");
			}, 50);
		});

		function initPortfolioCollapse() {
			resetPortfolioCollapse();
			$grid.isotope("layout");
		}

		$grid.one("arrangeComplete", initPortfolioCollapse);
		setTimeout(initPortfolioCollapse, 200);
		$(window).on("load", function () {
			initPortfolioCollapse();
		});

		var portfolioResizeTimer;
		$(window).on("resize", function () {
			clearTimeout(portfolioResizeTimer);
			portfolioResizeTimer = setTimeout(function () {
				if ($portfolioShowcase.hasClass("is-fully-expanded")) {
					return;
				}
				applyPortfolioCollapsedHeight(
					portfolioVisibleCount || getPortfolioItemsPerRow() * PORTFOLIO_INITIAL_ROWS
				);
				$grid.isotope("layout");
			}, 150);
		});

		var portfolioFilterCopy = {
			"*": "Projects across PNM, CBI, PAS, and others.",
			".pnm": "Projects I've worked on at PT Permodalan Nasional Madani (PNM).",
			".cbi": "Projects I've worked on at PT Century Batteries Indonesia (CBI).",
			".pas": "Projects I've built at PT Prakarsa Alam Segar (PAS) — MyPAS modules and compliance tools.",
			".others": "Personal and client projects outside PNM, CBI, and PAS.",
		};

		var stackFilterCopy = {
			"*": null,
			".stack-laravel": "Highlight: Laravel apps",
			".stack-react": "Highlight: React apps",
			".stack-ai": "Highlight: AI / computer-vision work (Gemini, Qdrant, InsightFace, YOLO)",
			".stack-webrtc": "Highlight: WebRTC / JavaFX live media",
			".stack-firebase": "Highlight: Firebase / Firestore",
			".stack-nodejs": "Highlight: Node.js / industrial I/O",
		};

		var companyFilter = "*";
		var stackFilter = "*";

		function updatePortfolioFilterDesc() {
			var $desc = $("#portfolio-filter-desc");
			if (!$desc.length) return;
			var companyText = portfolioFilterCopy[companyFilter] || portfolioFilterCopy["*"];
			var stackText = stackFilterCopy[stackFilter];
			if (stackFilter !== "*" && stackText) {
				$desc.text(stackText + " · " + companyText);
			} else {
				$desc.text(companyText);
			}
		}

		function combinedPortfolioFilter() {
			var $item = $(this);
			var companyOk = companyFilter === "*" || $item.is(companyFilter);
			var stackOk = stackFilter === "*" || $item.is(stackFilter);
			return companyOk && stackOk;
		}

		function applyPortfolioFilters() {
			portfolioVisibleCount = getPortfolioItemsPerRow() * PORTFOLIO_INITIAL_ROWS;
			$portfolioShowcase.removeClass("is-fully-expanded").addClass("is-collapsed");
			updatePortfolioFilterDesc();
			$grid.isotope({ filter: combinedPortfolioFilter });
		}

		// Company filter
		$(".filter-button-group").on("click", "button", function () {
			$(".filter-button-group button").removeClass("active");
			$(this).addClass("active");
			companyFilter = $(this).attr("data-filter") || "*";
			applyPortfolioFilters();
		});

		// Stack filter (AND with company)
		$(".stack-filter-button-group").on("click", "button", function () {
			$(".stack-filter-button-group button").removeClass("active");
			$(this).addClass("active");
			stackFilter = $(this).attr("data-stack-filter") || "*";
			applyPortfolioFilters();
		});

		/*------------------------------------------------------
  	/  Portfolio Gallery Carousel
  	/------------------------------------------------------*/
		$(".portfolio_gallery.owl-carousel").owlCarousel({
			items: 2,
			loop: true,
			lazyLoad: true,
			center: true,
			// autoWidth: true,
			autoplayHoverPause: true,
			autoplay: false,
			autoplayTimeout: 5000,
			smartSpeed: 800,
			margin: 30,
			nav: false,
			dots: true,
			mouseDrag: true,
			touchDrag: true,
			pullDrag: true,
			responsive: {
				// breakpoint from 0 up
				0: {
					items: 1,
					margin: 0,
				},
				// breakpoint from 768 up
				768: {
					items: 2,
					margin: 20,
				},
				992: {
					items: 2,
					margin: 30,
				},
			},
		});

		// Track Owl drag so PhotoSwipe/zoom don't treat swipe as a click
		$(document).on("drag.owl.carousel", ".portfolio_gallery", function () {
			window.__portfolioGalleryDragging = true;
		});
		$(document).on("dragged.owl.carousel translated.owl.carousel", ".portfolio_gallery", function () {
			setTimeout(function () {
				window.__portfolioGalleryDragging = false;
			}, 80);
		});

		/*------------------------------------------------------
  	/ Testimonial Carousel
  	/------------------------------------------------------*/
		$(".testimonial-carousel.owl-carousel").owlCarousel({
			loop: true,
			margin: 30,
			nav: false,
			dots: true,
			autoplay: false,
			active: true,
			smartSpeed: 1000,
			autoplayTimeout: 7000,
			responsive: {
				0: {
					items: 1,
				},
				600: {
					items: 2,
				},
				1000: {
					items: 2,
				},
			},
		});

		/*------------------------------------------------------
  	/ Post Gallery Carousel
  	/------------------------------------------------------*/
		$(".tj-post__gallery.owl-carousel").owlCarousel({
			items: 1,
			loop: true,
			margin: 30,
			dots: false,
			nav: true,
			navText: [
				'<i class="fal fa-arrow-left"></i>',
				'<i class="fal fa-arrow-right"></i>',
			],
			autoplay: false,
			smartSpeed: 1000,
			autoplayTimeout: 3000,
		});

		/*------------------------------------------------------
  	/  Nice Select
  	/------------------------------------------------------*/
		$("select").niceSelect();

		/*------------------------------------------------------
  	/  ALL Popup
  	/------------------------------------------------------*/
		if ($(".popup_video").length > 0) {
			$(`.popup_video`).lightcase({
				transition: "elastic",
				showSequenceInfo: false,
				slideshow: false,
				swipe: true,
				showTitle: false,
				showCaption: false,
				controls: true,
			});
		}

		$(".modal-popup").magnificPopup({
			type: "inline",
			fixedContentPos: false,
			fixedBgPos: true,
			overflowY: "auto",
			closeBtnInside: true,
			preloader: false,
			midClick: true,
			removalDelay: 300,
			mainClass: "popup-mfp",
		});
	});

	$(window).on("load", function () {
		/*------------------------------------------------------
  	/  WoW Js
  	/------------------------------------------------------*/
		var wow = new WOW({
			boxClass: "wow", // default
			animateClass: "animated", // default
			offset: 100, // default
			mobile: true, // default
			live: true, // default
		});
		wow.init();

		/*------------------------------------------------------
  	/  Preloader
  	/------------------------------------------------------*/
		const svg = document.getElementById("preloaderSvg");
		const tl = gsap.timeline();
		const curve = "M0 502S175 272 500 272s500 230 500 230V0H0Z";
		const flat = "M0 2S175 1 500 1s500 1 500 1V0H0Z";

		tl.to(".preloader-heading .load-text , .preloader-heading .cont", {
			delay: 1.5,
			y: -100,
			opacity: 0,
		});
		tl.to(svg, {
			duration: 0.5,
			attr: { d: curve },
			ease: "power2.easeIn",
		}).to(svg, {
			duration: 0.5,
			attr: { d: flat },
			ease: "power2.easeOut",
		});
		tl.to(".preloader", {
			y: -1500,
		});
		tl.to(".preloader", {
			zIndex: -1,
			display: "none",
		});

		/*------------------------------------------------------
  	/  Sidebar Hover BG Color
  	/------------------------------------------------------*/
		if ($(".side-navbar").length > 0) {
			function sidebar_animation() {
				var active_bg = $(".side-navbar ul .active-bg");

				$(".side-navbar ul li").on("mouseenter", function () {
					var element = $(this);
					activeSidebar(active_bg, element);
				});

				$(".side-navbar ul").on("mouseleave", function () {
					var element = $(".side-navbar ul li.is-current");
					activeSidebar(active_bg, element);
					element.closest("li").siblings().removeClass("mleave");
				});

				// Use MutationObserver to detect changes in the is-current class
				var observer = new MutationObserver(function (mutations) {
					mutations.forEach(function (mutation) {
						if (
							mutation.attributeName === "class" &&
							mutation.target.classList.contains("is-current")
						) {
							var element = $(".side-navbar ul li.is-current");
							activeSidebar(active_bg, element);
						}
					});
				});

				observer.observe(document.querySelector(".side-navbar ul"), {
					attributes: true,
					subtree: true,
				});

				// Initial setup
				var initialElement = $(".side-navbar ul li.is-current");
				activeSidebar(active_bg, initialElement);
			}

			sidebar_animation();

			function activeSidebar(active_bg, e) {
				if (!e.length) {
					return false;
				}
				var topOff = e.offset().top;
				var height = e.outerHeight();
				var menuTop = $(".side-navbar ul").offset().top;
				e.closest("li").removeClass("mleave");
				e.closest("li").siblings().addClass("mleave");
				active_bg.css({ top: topOff - menuTop + "px", height: height + "px" });
			}
		}

		/*------------------------------------------------------
  	/  Services Hover BG
  	/------------------------------------------------------*/
		function service_animation() {
			var active_bg = $(".services-widget .active-bg");
			var element = $(".services-widget .current");
			$(".services-widget .service-item").on("mouseenter", function () {
				var e = $(this);
				activeService(active_bg, e);
			});
			$(".services-widget").on("mouseleave", function () {
				element = $(".services-widget .current");
				activeService(active_bg, element);
				element.closest(".service-item").siblings().removeClass("mleave");
			});
			activeService(active_bg, element);
		}
		service_animation();

		function activeService(active_bg, e) {
			if (!e.length) {
				return false;
			}
			var topOff = e.offset().top;
			var height = e.outerHeight();
			var menuTop = $(".services-widget").offset().top;
			e.closest(".service-item").removeClass("mleave");
			e.closest(".service-item").siblings().addClass("mleave");
			active_bg.css({ top: topOff - menuTop + "px", height: height + "px" });
		}

		$(".services-widget .service-item").on("click", function () {
			$(".services-widget .service-item").removeClass("current");
			$(this).addClass("current");
		});

		/*------------------------------------------------------
  	/  Portfolio Filter BG Color
  	/------------------------------------------------------*/
		function filter_animation() {
			$(".portfolio-filter .button-group").each(function () {
				var $group = $(this);
				var active_bg = $group.find(".active-bg");
				var element = $group.find("button.active");
				$group.find("button").on("click", function () {
					activeFilterBtn(active_bg, $(this), $group);
				});
				activeFilterBtn(active_bg, element, $group);
			});
		}
		filter_animation();

		function activeFilterBtn(active_bg, e, $group) {
			if (!e.length || !$group || !$group.length) {
				return false;
			}
			var leftOff = e.offset().left;
			var width = e.outerWidth();
			var menuLeft = $group.offset().left;
			active_bg.css({ left: leftOff - menuLeft + "px", width: width + "px" });
		}

		/*------------------------------------------------------
  	/  Funfact
  	/------------------------------------------------------*/
		if ($(".odometer").length > 0) {
			var projectCount = document.querySelectorAll(".portfolio-item").length;
			if (projectCount > 0) {
				$('.odometer[data-stat="projects"]').attr("data-count", projectCount);
			}
			$(".odometer").appear(function () {
				var odo = $(".odometer");
				odo.each(function () {
					var countNumber = $(this).attr("data-count");
					$(this).html(countNumber);
				});
			});
		}
	});
})(jQuery);
