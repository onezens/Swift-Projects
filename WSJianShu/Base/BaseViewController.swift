//
//  BaseViewController.swift
//  WSJianShu
//
//  Created by wangzhen on 16/9/21.
//  Copyright © 2016年 www.wackosix.cn. All rights reserved.
//

import UIKit
import MBProgressHUD


enum ToastType : NSInteger {
    case error     =   1
    case warning   =   2
    case success   =   3
}

class BaseViewController: UIViewController {
    
//    var showLoadingView: UIView?
    
    lazy var leftBarBtn : BaseNavButton = {
        let btn = BaseNavButton.navButton()
        btn.addTarget(self, action: #selector(BaseViewController.goBack), for: .touchUpInside)
        return btn
    }()
    
    lazy var rightBarBtn : BaseNavButton = {
        return BaseNavButton.navButton(type: .right)
    }()
    
    lazy var rightSecBarBtn : BaseNavButton = {
        return BaseNavButton.navButton(type: .secRight)
    }()
    
    // MARK: - override method
    
    override func viewDidLoad() {
        
        super.viewDidLoad()
        setUpUI()
    }
    
    
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        
    }
    
}

extension BaseViewController : UIGestureRecognizerDelegate {
    
    // MARK: - public method
    func setUpUI() -> Void {
        navigationController?.interactivePopGestureRecognizer?.delegate = self
        view.backgroundColor = UIColor.white
        if navigationController != nil {
            if navigationController!.viewControllers.count > 1 {
                setLeftBackBarBtn()
            }
        }
    }
    
    func checkLogin() -> Bool {
        return true
    }
    
    func setLeftBarBtn(image: UIImage, hlImage: UIImage) {
        navigationItem.leftBarButtonItem  = setBtn(btn: leftBarBtn, image: image, hlImage: hlImage, text: nil)
        
    }
    
    func setRightBarBtn(image: UIImage, hlImage: UIImage) -> Void {
        navigationItem.rightBarButtonItem = setBtn(btn: rightBarBtn, image: image, hlImage: hlImage, text: nil)
    }
    
    func setLeftBarBtn(image: UIImage, hlImage: UIImage, text: String) -> Void {
        navigationItem.leftBarButtonItem = setBtn(btn: leftBarBtn, image: image, hlImage: hlImage, text: text)
    }
    
    func setLeftBarBtn(text: String) -> Void {
        navigationItem.leftBarButtonItem = setBtn(btn: leftBarBtn, image: nil, hlImage: nil, text: text)
        
    }
    
    func setRightBarBtn(text: String) -> Void {
        navigationItem.rightBarButtonItem = setBtn(btn: rightBarBtn, image: nil, hlImage: nil, text: text)
        
    }
    
    func setLeftBackBarBtn() -> Void {
        let image = UIImage.init(named: "icon_tabbar_back")!
        setLeftBarBtn(image: image, hlImage: UIImage.renderImage(image: image, size: image.size, renderColor: UIColor.getNavBarHLTintColor()))
        //        setLeftBarBtn(image: image, hlImage: UIImage.renderImage(image: image, size: image.size, renderColor: UIColor.getNavBarHLTintColor()), text: "back")
    }
    
    func goBack() -> Void {
        _ = navigationController?.popViewController(animated: true)
    }
    
    func requestSuccess() -> Void {
        
    }
    
    func requestFailed() -> Void {
        
    }
    
    func showLoadingView() -> Void {
        
        MBProgressHUD.showAdded(to: self.view, animated: true)
    }
    
    func dismissLoadingView() -> Void {
        MBProgressHUD.hide(for: self.view, animated: true)
    }
    
    func showEmptyLoadingView() -> Void {
        
    }
    
    func showEmptyLoadingView(text: String) -> Void {
        
    }
    
    func dismissEmptyLoadingView() -> Void {
        
    }
    
    func showUnloginView() -> Void {
        
    }
    
    func dismissUnloginView() -> Void {
        
    }
    
    func showNoNetworkView() -> Void {
        
    }
    
    func dismissNoNetworkView() -> Void {
        
    }
    
    func noNetworkBtnClick() -> Void {
        
    }
    
    func showToastWithType(type: ToastType, text: String) {
        
        
    }
    
    func showNoNetworkToast() -> Void {
        
    }
    
    func showEmptyView() -> Void {
        
    }
    
    func dismissEmptyView() -> Void {
        
    }
    
    // MARK: - private method
    
    private func setBtn(btn: BaseNavButton, image: UIImage?, hlImage: UIImage?, text: String?) -> UIBarButtonItem {
        btn.setImage(image, for: .normal)
        btn.setImage(hlImage, for: .highlighted)
        btn.setTitle(text, for: .normal)
        btn.setTitleColor(UIColor.getNavBarTintColor(), for: .normal)
        btn.setTitleColor(UIColor.getNavBarHLTintColor(), for: .highlighted)
        btn.sizeToFit()
        let item = UIBarButtonItem(customView: btn)
        return item
    }


}

/// Delegate
extension BaseViewController {

    func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
        
        if let nav = navigationController {
            if nav.viewControllers.count > 1 {
                return true
            }
        }
        return false
    }
}
