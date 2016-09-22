//
//  BaseViewController.swift
//  WSJianShu
//
//  Created by wangzhen on 16/9/21.
//  Copyright © 2016年 www.wackosix.cn. All rights reserved.
//

import UIKit


enum ToastType : NSInteger {
    case error     =   1
    case warning      =   2
    case success   =   3
}

class BaseViewController: UIViewController {
    
    lazy var leftBarBtn : UIButton = {
        let btn = UIButton()
        btn.addTarget(self, action: #selector(BaseViewController.goBack), for: .touchUpInside)
        return btn
    }()
    
    lazy var rightBarBtn : UIButton = {
        return UIButton()
    }()
    
    lazy var rightSecBarBtn : UIButton = {
        return UIButton ()
    }()
    
    
    
    // MARK: - public method
    func setUpUI() -> Void {
        
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
        setLeftBarBtn(image: image, hlImage: UIImage.compressImage(image: image, size: image.size))
    }
    
    func goBack() -> Void {
       _ = navigationController?.popViewController(animated: true)
    }
    
    func requestSuccess() -> Void {
        
    }
    
    func requestFailed() -> Void {
        
    }
    
    func showLoadingView() -> Void {
        
    }
    
    func dismissLoadingView() -> Void {
        
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
    
    
    private func setBtn(btn: UIButton, image: UIImage?, hlImage: UIImage?, text: String?) -> UIBarButtonItem {
        btn.setImage(image, for: .normal)
        btn.setImage(hlImage, for: .highlighted)
        btn.setTitle(text, for: .normal)
        btn.setTitleColor(UIColor.getNavBarTintColor(), for: .normal)
        btn.setTitleColor(UIColor.getNavBarHLTintColor(), for: .highlighted)
        btn.sizeToFit()
        let item = UIBarButtonItem(customView: btn)
        return item
    }
    
    // MARK: - override method
    
    override func viewDidLoad() {
        
        super.viewDidLoad()
        setUpUI()
    }
    
    
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        
    }
    
    
    
}
